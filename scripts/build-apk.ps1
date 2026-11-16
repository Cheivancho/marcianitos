# Compila el APK de release desde una copia en una ruta corta (E:\mc).
# Motivo: en Windows las herramientas C++ del NDK fallan con rutas de mas de 260 caracteres.
# Uso: powershell -File scripts\build-apk.ps1
#   -Emulador : compila para x86_64 (emulador de PC) en vez de ARM (celulares). Genera dist\marcianitos-emulador.apk.
param([string]$Destino = 'E:\mc', [switch]$Emulador)

$ErrorActionPreference = 'Stop'
$origen = Split-Path -Parent $PSScriptRoot
$log = Join-Path $env:TEMP 'gradle-build.log'
Remove-Item $log -ErrorAction SilentlyContinue

$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'

function Registrar($msg) {
  $linea = "[$(Get-Date -Format HH:mm:ss)] $msg"
  Write-Host $linea
  $linea | Out-File -FilePath $log -Append -Encoding ascii
}

Registrar "Sincronizando codigo a $Destino"
robocopy $origen $Destino /MIR /XD node_modules android .expo .git dist /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy fallo ($LASTEXITCODE)" }

Registrar 'Sincronizando node_modules'
robocopy (Join-Path $origen 'node_modules') (Join-Path $Destino 'node_modules') /MIR /MT:16 /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy node_modules fallo ($LASTEXITCODE)" }

Set-Location $Destino

if (-not (Test-Path (Join-Path $Destino 'android'))) {
  Registrar 'Generando proyecto nativo (prebuild)'
  npx expo prebuild --platform android --no-install *>> $log
  $props = Join-Path $Destino 'android\gradle.properties'
  (Get-Content $props) -replace '^reactNativeArchitectures=.*', 'reactNativeArchitectures=armeabi-v7a,arm64-v8a' | Set-Content $props -Encoding ascii
  "sdk.dir=$($env:ANDROID_HOME.Replace('\','/'))" | Set-Content (Join-Path $Destino 'android\local.properties') -Encoding ascii
}

# Firma con la clave propia de la app (keys\marcianitos.keystore). Si cambia la clave, el celu
# rechaza actualizar el APK y habria que desinstalar la app (se perderian los datos).
$clave = Join-Path $origen 'keys\marcianitos.keystore'
if (-not (Test-Path $clave)) { throw "Falta la clave de firma: $clave" }
Copy-Item $clave (Join-Path $Destino 'android\app\debug.keystore') -Force

Registrar 'Compilando con Gradle (puede tardar)'
Set-Location (Join-Path $Destino 'android')
$init = Join-Path $Destino 'scripts\gradle-long-paths.init.gradle'
# En PowerShell 5.1 los avisos de Gradle (stderr) se vuelven errores y abortan el script
# si ErrorActionPreference es 'Stop'. Para esta llamada lo dejamos en 'Continue'.
$ErrorActionPreference = 'Continue'
$android = Join-Path $Destino 'android'
Set-Location $android
$extra = @()
if ($Emulador) { $extra += '-PreactNativeArchitectures=x86_64' }
& .\gradlew.bat -I $init assembleRelease --no-daemon @extra 2>&1 | ForEach-Object { "$_" } | Out-File -FilePath $log -Append -Encoding ascii
$codigo = $LASTEXITCODE
$ErrorActionPreference = 'Stop'

if ($codigo -eq 0) {
  $apk = Get-ChildItem (Join-Path $Destino 'android\app\build\outputs\apk\release') -Filter *.apk | Select-Object -First 1
  New-Item -ItemType Directory -Force (Join-Path $origen 'dist') | Out-Null
  $nombre = if ($Emulador) { 'marcianitos-emulador.apk' } else { 'marcianitos.apk' }
  Copy-Item $apk.FullName (Join-Path $origen "dist\$nombre") -Force
  Registrar "APK listo: $(Join-Path $origen "dist\$nombre")"
}
"EXIT=$codigo" | Out-File -FilePath $log -Append -Encoding ascii
