# Genere les icones (PNG pour la PWA, ICO pour Windows) : fond graphite, puce claire, noyau bleu.
Add-Type -AssemblyName System.Drawing
function New-Bmp($S) {
  $bmp = New-Object System.Drawing.Bitmap $S, $S
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(20, 22, 28))
  $k = $S / 256.0
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(236, 238, 243)), (12 * $k)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $g.DrawRectangle($pen, 82 * $k, 82 * $k, 92 * $k, 92 * $k)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(125, 167, 232))), 108 * $k, 108 * $k, 40 * $k, 40 * $k)
  foreach ($p in 100, 128, 156) {
    $g.DrawLine($pen, $p * $k, 56 * $k, $p * $k, 76 * $k); $g.DrawLine($pen, $p * $k, 180 * $k, $p * $k, 200 * $k)
    $g.DrawLine($pen, 56 * $k, $p * $k, 76 * $k, $p * $k); $g.DrawLine($pen, 180 * $k, $p * $k, 200 * $k, $p * $k)
  }
  $g.Dispose(); $bmp
}
$web = Join-Path $PSScriptRoot 'desktop\renderer'
foreach ($s in 192, 512) { $b = New-Bmp $s; $b.Save("$web\icon-$s.png", [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose() }
$b = New-Bmp 256; $ms = New-Object System.IO.MemoryStream; $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $png = $ms.ToArray(); $b.Dispose()
$fs = [System.IO.File]::Create((Join-Path $PSScriptRoot 'desktop\build\icon.ico')); $bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)
$bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0)
$bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$png.Length); $bw.Write([uint32]22); $bw.Write($png); $bw.Close()
'ok'
