param (
    [ValidateSet("development","production")]
    [string]$env = "development"
)

Write-Host "⚙️ Cambiando a entorno: $env" -ForegroundColor Cyan

# Setear variable de entorno
$env:NODE_ENV = $env

# Confirmar
Write-Host "✅ NODE_ENV configurado como: $env" -ForegroundColor Green

# Ejecutar script de prueba de conexión
Write-Host "🧪 Probando conexión a MongoDB..." -ForegroundColor Yellow
node scripts/test-db.js
