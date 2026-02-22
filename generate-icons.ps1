Add-Type -AssemblyName System.Drawing

function Create-PwaIcon {
    param([int]$Size, [string]$OutputPath)
    
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
    
    $scale = $Size / 100.0
    
    # Rounded rectangle helper
    function Draw-RoundedRect {
        param($X, $Y, $W, $H, $R, $Color)
        $brush = New-Object System.Drawing.SolidBrush($Color)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc($X, $Y, $R*2, $R*2, 180, 90)
        $path.AddArc($X+$W-$R*2, $Y, $R*2, $R*2, 270, 90)
        $path.AddArc($X+$W-$R*2, $Y+$H-$R*2, $R*2, $R*2, 0, 90)
        $path.AddArc($X, $Y+$H-$R*2, $R*2, $R*2, 90, 90)
        $path.CloseFigure()
        $g.FillPath($brush, $path)
        $brush.Dispose()
        $path.Dispose()
    }
    
    # Draw background rounded rect (blue glow)
    Draw-RoundedRect -X 0 -Y 0 -W $Size -H $Size -R (10*$scale) -Color ([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    
    # Shelf 1 (brightest blue)
    $s1c = [System.Drawing.Color]::FromArgb(230, 96, 165, 250)
    $shelf1Y = [int](20*$scale); $shelfH = [int](12*$scale); $shelfX = [int](15*$scale); $shelfW = [int](70*$scale)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($s1c)), $shelfX, $shelf1Y, $shelfW, $shelfH)
    
    # Shelf 2
    $s2c = [System.Drawing.Color]::FromArgb(180, 96, 165, 250)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($s2c)), $shelfX, [int](38*$scale), $shelfW, $shelfH)
    
    # Shelf 3
    $s3c = [System.Drawing.Color]::FromArgb(130, 96, 165, 250)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($s3c)), $shelfX, [int](56*$scale), $shelfW, $shelfH)
    
    # Items on shelves (dark boxes)
    $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 30, 41, 59))
    $g.FillRectangle($darkBrush, [int](20*$scale), [int](24*$scale), [int](20*$scale), [int](4*$scale))
    $g.FillRectangle($darkBrush, [int](45*$scale), [int](24*$scale), [int](15*$scale), [int](4*$scale))
    $g.FillRectangle($darkBrush, [int](20*$scale), [int](42*$scale), [int](25*$scale), [int](4*$scale))
    $g.FillRectangle($darkBrush, [int](20*$scale), [int](60*$scale), [int](18*$scale), [int](4*$scale))
    $g.FillRectangle($darkBrush, [int](44*$scale), [int](60*$scale), [int](22*$scale), [int](4*$scale))
    
    # Bottom bar
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 59, 130, 246))
    $g.FillRectangle($barBrush, [int](10*$scale), [int](74*$scale), [int](80*$scale), [int](6*$scale))
    
    $g.Dispose()
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "✅ Gerado: $OutputPath"
}

$publicDir = "c:\Users\dajud\OneDrive\Documentos\sala fria\public"
if (!(Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }

Create-PwaIcon -Size 192 -OutputPath "$publicDir\pwa-192.png"
Create-PwaIcon -Size 512 -OutputPath "$publicDir\pwa-512.png"

Write-Host "`n✅ Ícones PWA gerados com sucesso!"
