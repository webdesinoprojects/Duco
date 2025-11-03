# PowerShell script to upload T-shirt images to Cloudinary

$cloudName = "dpojtbeve"
$apiKey = "314328365196326"
$apiSecret = "gP_VFc4aEV6l5uJ9IJQryyD2fU"

# Function to upload image
function Upload-Image {
    param(
        [string]$FilePath,
        [string]$PublicId
    )
    
    $url = "https://api.cloudinary.com/v1_1/$cloudName/image/upload"
    
    # Create form data
    $form = @{
        file = Get-Item $FilePath
        public_id = $PublicId
        folder = "tshirt-views"
        api_key = $apiKey
    }
    
    # Generate timestamp
    $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
    $form.timestamp = $timestamp
    
    # Create signature string
    $signatureString = "folder=tshirt-views&public_id=$PublicId&timestamp=$timestamp$apiSecret"
    $signature = [System.Security.Cryptography.SHA1]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($signatureString))
    $signatureHex = [System.BitConverter]::ToString($signature).Replace("-", "").ToLower()
    $form.signature = $signatureHex
    
    try {
        Write-Host "Uploading $FilePath..."
        $response = Invoke-RestMethod -Uri $url -Method Post -Form $form
        Write-Host "✅ Success: $($response.secure_url)"
        return $response.secure_url
    }
    catch {
        Write-Host "❌ Failed: $($_.Exception.Message)"
        return $null
    }
}

# Upload all T-shirt images
$images = @(
    @{ Path = "Duco_frontend/public/cloud/front.jpg"; Id = "tshirt-front" },
    @{ Path = "Duco_frontend/public/cloud/back.jpg"; Id = "tshirt-back" },
    @{ Path = "Duco_frontend/public/cloud/left.jpg"; Id = "tshirt-left" },
    @{ Path = "Duco_frontend/public/cloud/right.jpg"; Id = "tshirt-right" }
)

$urls = @{}

foreach ($image in $images) {
    $url = Upload-Image -FilePath $image.Path -PublicId $image.Id
    if ($url) {
        $urls[$image.Id] = $url
    }
}

Write-Host "`n🎯 T-shirt Image URLs:"
Write-Host "Front View: $($urls['tshirt-front'])"
Write-Host "Back View: $($urls['tshirt-back'])"
Write-Host "Left View: $($urls['tshirt-left'])"
Write-Host "Right View: $($urls['tshirt-right'])"