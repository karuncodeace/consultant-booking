# PowerShell script to set VAPID secrets in Supabase
# Replace the values below with your actual VAPID keys from .env file

# Read from .env file (adjust path if needed)
$envContent = Get-Content .env
$publicKey = ""
$privateKey = ""

foreach ($line in $envContent) {
    if ($line -match "VITE_VAPID_PUBLIC_KEY=(.+)") {
        $publicKey = $matches[1]
    }
    if ($line -match "VAPID_PRIVATE_KEY=(.+)") {
        $privateKey = $matches[1]
    }
}

if ($publicKey -and $privateKey) {
    Write-Host "Setting VAPID secrets..."
    npx supabase secrets set VAPID_PUBLIC_KEY=$publicKey
    npx supabase secrets set VAPID_PRIVATE_KEY=$privateKey
    npx supabase secrets set VAPID_EMAIL=admin@example.com
    Write-Host "✅ Secrets set successfully!"
} else {
    Write-Host "❌ Could not find VAPID keys in .env file"
    Write-Host "Please set them manually:"
    Write-Host "npx supabase secrets set VAPID_PUBLIC_KEY=your_public_key"
    Write-Host "npx supabase secrets set VAPID_PRIVATE_KEY=your_private_key"
    Write-Host "npx supabase secrets set VAPID_EMAIL=admin@example.com"
}

