param(
    [string]$JsonPath = "",
    [string]$PrinterName = ""
)

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA {
            pDocName = "Waroeng Seblak 48 Struk",
            pOutputFile = null,
            pDataType = "RAW"
        };

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pBytes = Marshal.AllocCoTaskMem(data.Length);
                    Marshal.Copy(data, 0, pBytes, data.Length);
                    int dwWritten = 0;
                    WritePrinter(hPrinter, pBytes, data.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
            return true;
        }
        return false;
    }
}
"@

try {
    # 1. Cari Nama Printer
    if (-not $PrinterName) {
        $found = Get-CimInstance Win32_Printer | Where-Object { 
            $_.Name -like "*POS58*" -or $_.Name -like "*POS-58*" -or $_.Name -like "*58 Printer*" -or $_.Name -like "*Woya*" 
        } | Select-Object -First 1
        if ($found) {
            $PrinterName = $found.Name
        } else {
            $PrinterName = "POS58 Printer"
        }
    }

    # 2. Baca Data Transaksi
    if (-not $JsonPath -or -not (Test-Path $JsonPath)) {
        throw "File data JSON tidak ditemukan di $JsonPath"
    }

    $rawContent = [System.IO.File]::ReadAllText($JsonPath, [System.Text.Encoding]::UTF8)
    $data = $rawContent | ConvertFrom-Json
    $tx = $data.transaction
    $set = $data.settings

    # 3. Format Tanggal & Angka Rupiah
    function Format-Rp([double]$num) {
        return "Rp " + [string]::Format([System.Globalization.CultureInfo]::GetCultureInfo("id-ID"), "{0:N0}", $num)
    }

    function Format-Tanggal([string]$dStr) {
        try {
            $dt = [DateTime]::Parse($dStr)
            return $dt.ToString("dd/MM/yyyy HH:mm")
        } catch {
            return $dStr
        }
    }

    # 4. Helper Parser Pesanan (Makan di mana, Kuah, Pedas, Catatan)
    $notesList = @()
    if ($tx.notes) { $notesList += $tx.notes }
    if ($tx.items) {
        foreach ($it in $tx.items) {
            if ($it.notes) { $notesList += $it.notes }
        }
    }
    $combined = $notesList -join " "

    $dineType = "Makan di Sini"
    if ($combined -match "dibungkus|takeaway|take away|bawa pulang") {
        $dineType = "Dibungkus"
    }

    $brothType = "Asin Manis"
    if ($combined -match "kuah[:\s]+([^|·,]+)") {
        $brothType = $matches[1].Trim()
    }

    $spicy = "Original"
    if ($combined -match "pedas[:\s]+([^|·,]+)") {
        $rawSp = $matches[1].Trim()
        if ($rawSp -match "^\d+$") { $spicy = "Level $rawSp" } else { $spicy = $rawSp }
    } else {
        $seblak = $tx.items | Where-Object { $_.levelPedas -ne $null } | Select-Object -First 1
        if ($seblak) {
            if ($seblak.levelPedas -eq 0) { $spicy = "Original" } else { $spicy = "Level " + $seblak.levelPedas }
        }
    }

    $customerNote = ""
    if ($combined -match "catatan[:\s]+([^|·]+)") {
        $customerNote = $matches[1].Trim()
    }

    # 5. Pisahkan Topping & Minuman
    $drinks = @()
    $toppingHash = @{}

    foreach ($it in $tx.items) {
        $mName = if ($it.menuItemName) { $it.menuItemName.ToLower() } else { "" }
        $mId = if ($it.menuItemId) { $it.menuItemId } else { "" }
        $itNotes = if ($it.notes) { $it.notes.ToLower() } else { "" }

        $isDrink = $mId.StartsWith("drink") -or 
                   $itNotes.Contains("minuman") -or 
                   $mName.StartsWith("es ") -or 
                   $mName.Contains("teh") -or 
                   $mName.Contains("jeruk") -or 
                   $mName.Contains("air mineral")

        if ($isDrink) {
            $drinks += $it
        } else {
            if ($it.toppings) {
                foreach ($top in $it.toppings) {
                    $tName = $top.name
                    if ($toppingHash.ContainsKey($tName)) {
                        $toppingHash[$tName] += 1
                    } else {
                        $toppingHash[$tName] = 1
                    }
                }
            }
        }
    }

    # 6. Rakit Buffer ESC/POS
    $enc = [System.Text.Encoding]::GetEncoding("GBK")
    $buffer = [System.Collections.Generic.List[byte]]::new()

    function Add-Bytes([byte[]]$b) {
        $buffer.AddRange($b)
    }

    function Add-Text([string]$t) {
        $b = $enc.GetBytes($t)
        $buffer.AddRange($b)
    }

    # Initialize
    Add-Bytes @(0x1B, 0x40)

    # 1. Header (Center)
    Add-Bytes @(0x1B, 0x61, 0x01) # Align center
    Add-Bytes @(0x1D, 0x21, 0x11) # Double width & height
    $sName = if ($set.storeName) { $set.storeName } else { "WAROENG SEBLAK 48" }
    Add-Text "$sName`n"
    Add-Bytes @(0x1D, 0x21, 0x00) # Normal size

    if ($set.slogan) { Add-Text "$($set.slogan)`n" }
    if ($set.address) { Add-Text "$($set.address)`n" }
    if ($set.phone) { Add-Text "WA: $($set.phone)`n" }
    Add-Text "--------------------------------`n"

    # 2. Info Transaksi (Left)
    Add-Bytes @(0x1B, 0x61, 0x00) # Align left
    Add-Text "No. Nota  : $($tx.invoiceNumber)`n"
    Add-Text "Waktu     : $(Format-Tanggal $tx.date)`n"
    $cust = if ($tx.customerName) { $tx.customerName } else { "Pelanggan Umum" }
    Add-Text "Pelanggan : $cust`n"
    Add-Text "--------------------------------`n"

    # 3. Detail Pesanan (BESAR & TEBAL)
    Add-Bytes @(0x1D, 0x21, 0x01) # Double height
    Add-Text "MAKAN DI: $($dineType.ToUpper())`n"
    Add-Text "KUAH    : $($brothType.ToUpper())`n"
    Add-Text "PEDAS   : $($spicy.ToUpper())`n"
    Add-Bytes @(0x1D, 0x21, 0x00) # Normal

    if ($customerNote) {
        Add-Text "Catatan : $customerNote`n"
    }
    Add-Text "--------------------------------`n"

    # 4. Topping & Minuman
    $totalToppingCount = 0
    foreach ($k in $toppingHash.Keys) { $totalToppingCount += $toppingHash[$k] }

    $topTitle = "TOPPING"
    if ($totalToppingCount -gt 0) { $topTitle += " ($totalToppingCount pcs)" }
    Add-Text "${topTitle}:`n"

    if ($toppingHash.Count -gt 0) {
        foreach ($k in $toppingHash.Keys) {
            Add-Text " • $k x$($toppingHash[$k])`n"
        }
    } else {
        Add-Text " - Tanpa Topping Tambahan -`n"
    }
    Add-Text "--------------------------------`n"

    Add-Text "MINUMAN:`n"
    if ($drinks.Count -gt 0) {
        foreach ($d in $drinks) {
            Add-Text " • $($d.menuItemName) x$($d.quantity)`n"
        }
    } else {
        Add-Text " - Tanpa Minuman -`n"
    }
    Add-Text "--------------------------------`n"

    # 5. TOTAL (Double Width & Height)
    Add-Bytes @(0x1D, 0x21, 0x11)
    Add-Text "TOTAL: $(Format-Rp $tx.totalAmount)`n"
    Add-Bytes @(0x1D, 0x21, 0x00)
    Add-Text "--------------------------------`n"

    # 6. Footer (Center)
    Add-Bytes @(0x1B, 0x61, 0x01)
    Add-Text "Hatur Nuhun! Wilujeng Tuang!`n"
    Add-Text "Simpan struk bukti pembayaran.`n`n`n`n" # 4 feeds

    # Paper Cut
    Add-Bytes @(0x1D, 0x56, 0x42, 0x00)

    # 7. Kirim ke Printer
    $bytes = $buffer.ToArray()
    $success = [RawPrinter]::SendBytesToPrinter($PrinterName, $bytes)

    if ($success) {
        $result = @{ success = $true; printer = $PrinterName; message = "Struk berhasil dicetak di $PrinterName" }
    } else {
        $result = @{ success = $false; printer = $PrinterName; error = "Gagal mengirim data ke printer $PrinterName" }
    }
    Write-Output ($result | ConvertTo-Json -Compress)
} catch {
    $errObj = @{ success = $false; error = $_.Exception.Message }
    Write-Output ($errObj | ConvertTo-Json -Compress)
}
