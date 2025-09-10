Write-Output "🚀 Escaneando inicializaciones de Firebase..."

# Ruta raíz del proyecto
$root = Get-Location

# Archivo de salida
$output = "duplicados.txt"
Remove-Item $output -ErrorAction SilentlyContinue

# Buscar todos los .js y .jsx, pero excluir node_modules, dist y .git
$files = Get-ChildItem -Path $root -Include *.js,*.jsx -Recurse -ErrorAction SilentlyContinue |
         Where-Object {
             $_.FullName -notmatch "\\node_modules\\" -and
             $_.FullName -notmatch "\\dist\\" -and
             $_.FullName -notmatch "\\.git\\"
         }

foreach ($file in $files) {
    try {
        $lines = Get-Content $file.FullName -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            if ($line -match "initializeApp") {
                Add-Content $output "⚠️ initializeApp en $($file.FullName) -> $line"
            }
        }
    }
    catch {
        Write-Output "⛔ No se pudo leer: $($file.FullName)"
    }
}

Write-Output "✅ Escaneo finalizado. Revisa $output"
