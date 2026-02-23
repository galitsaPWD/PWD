# Auto-Deploy Script for Edge Function
# Run this after you've logged in with: npx supabase login

$PROJECT_REF = "chhnfmdyswmvmkszkvih"

Write-Host "🚀 Deploying Edge Function..." -ForegroundColor Cyan

# Link project
Write-Host "`n📌 Linking to project..." -ForegroundColor Yellow
npx supabase link --project-ref $PROJECT_REF

# Deploy function
Write-Host "`n🔧 Deploying create-user function..." -ForegroundColor Yellow
npx supabase functions deploy create-user

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "Go to Admin Dashboard → Staff Management → Add Staff to test it!" -ForegroundColor Cyan
