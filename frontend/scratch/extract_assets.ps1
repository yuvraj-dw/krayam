Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Pranjal\.gemini\antigravity-ide\brain\e5442228-029d-41c9-9619-cbb437b4aeb3\.user_uploaded\media_1789742525763.jpg"
$destDir = "C:\Users\Pranjal\Documents\farmer-web-app-full\public\assets\home"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Source Dimensions: $($srcBmp.Width) x $($srcBmp.Height)"

# Function to crop and save
function Save-Crop {
    param (
        [int]$x,
        [int]$y,
        [int]$width,
        [int]$height,
        [string]$fileName
    )
    $rect = New-Object System.Drawing.Rectangle($x, $y, $width, $height)
    $cropped = $srcBmp.Clone($rect, $srcBmp.PixelFormat)
    $outPath = Join-Path $destDir $fileName
    $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Output "Saved: $fileName ($width x $height)"
}

# The reference image is 1024 x 682
# Let's inspect coordinates of hero, news thumbnails, footer:
# Top header is around y=0 to 48
# Hero section is around y=48 to 260. Hero farmer image is in x=360 to 1024, y=48 to 260
Save-Crop 360 48 (1024 - 360) (260 - 48) "hero-farmer.png"

# News 1: around x=70, y=315, w=80, h=52
Save-Crop 72 315 80 54 "news-1.png"

# News 2: around x=70, y=388, w=80, h=52
Save-Crop 72 388 80 54 "news-2.png"

# News 3: around x=70, y=460, w=80, h=52
Save-Crop 72 460 80 54 "news-3.png"

# News 4: around x=70, y=532, w=80, h=52
Save-Crop 72 532 80 54 "news-4.png"

# Footer landscape: around x=0, y=595 to 682
Save-Crop 0 590 1024 (682 - 590) "footer-landscape.png"

$srcBmp.Dispose()
Write-Output "Done extracting assets!"
