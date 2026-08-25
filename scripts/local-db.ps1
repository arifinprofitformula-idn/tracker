param(
  [ValidateSet("init", "start", "stop", "restart", "status")]
  [string]$Command = "start"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LocalDir = Join-Path $Root ".local"
$DataDir = Join-Path $LocalDir "postgres-data"
$LogFile = Join-Path $LocalDir "postgres.log"
$Port = 5433
$DbName = "tracker_local"
$DbUser = "tracker"
$DbPassword = "tracker_local_password"

function Get-Bin($Name) {
  $CommandInfo = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $CommandInfo) {
    throw "$Name was not found. Install PostgreSQL or enable Laragon PostgreSQL in PATH."
  }
  return $CommandInfo.Source
}

function Invoke-Logged($File, [string[]]$Arguments) {
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$File failed with exit code $LASTEXITCODE"
  }
}

function Invoke-Scalar($Query) {
  $Output = & $Psql -h "localhost" -p "$Port" -U "postgres" -d "postgres" -tAc $Query
  if ($LASTEXITCODE -ne 0) {
    throw "$Psql failed with exit code $LASTEXITCODE"
  }
  return (($Output | Out-String).Trim())
}

$InitDb = Get-Bin "initdb"
$PgCtl = Get-Bin "pg_ctl"
$Psql = Get-Bin "psql"

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null

function Initialize-DatabaseCluster {
  if (Test-Path (Join-Path $DataDir "PG_VERSION")) {
    return
  }

  Write-Host "Initializing local PostgreSQL data directory..."
  Invoke-Logged $InitDb @("-D", $DataDir, "-U", "postgres", "--auth=trust", "--encoding=UTF8")
}

function Test-ServerRunning {
  & $PgCtl status "-D" $DataDir *> $null
  if ($LASTEXITCODE -eq 0) {
    return $true
  }

  & $Psql -h "localhost" -p "$Port" -U "postgres" -d "postgres" -tAc "SELECT 1" *> $null
  return $LASTEXITCODE -eq 0
}

function Start-Database {
  Initialize-DatabaseCluster

  if (-not (Test-ServerRunning)) {
    Write-Host "Starting local PostgreSQL on port $Port..."
    Invoke-Logged $PgCtl @("start", "-D", $DataDir, "-l", $LogFile, "-o", "-p $Port")
  }

  Ensure-Database
}

function Ensure-Database {
  $roleExists = Invoke-Scalar "SELECT 1 FROM pg_roles WHERE rolname = '$DbUser'"
  if ($roleExists -ne "1") {
    Write-Host "Creating PostgreSQL role $DbUser..."
    Invoke-Logged $Psql @("-h", "localhost", "-p", "$Port", "-U", "postgres", "-d", "postgres", "-c", "CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword';")
  }
  Invoke-Logged $Psql @("-h", "localhost", "-p", "$Port", "-U", "postgres", "-d", "postgres", "-c", "ALTER ROLE $DbUser CREATEDB;")

  $dbExists = Invoke-Scalar "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
  if ($dbExists -ne "1") {
    Write-Host "Creating PostgreSQL database $DbName..."
    Invoke-Logged $Psql @("-h", "localhost", "-p", "$Port", "-U", "postgres", "-d", "postgres", "-c", "CREATE DATABASE $DbName OWNER $DbUser;")
  }

  Invoke-Logged $Psql @("-h", "localhost", "-p", "$Port", "-U", "postgres", "-d", $DbName, "-c", "GRANT ALL ON SCHEMA public TO $DbUser;")
  Write-Host "Local database is ready: postgresql://${DbUser}:***@localhost:$Port/$DbName"
}

function Stop-Database {
  if (Test-Path (Join-Path $DataDir "PG_VERSION")) {
    Invoke-Logged $PgCtl @("stop", "-D", $DataDir, "-m", "fast")
  } else {
    Write-Host "Local PostgreSQL data directory does not exist yet."
  }
}

switch ($Command) {
  "init" {
    Initialize-DatabaseCluster
    Start-Database
  }
  "start" {
    Start-Database
  }
  "stop" {
    Stop-Database
  }
  "restart" {
    Stop-Database
    Start-Database
  }
  "status" {
    if (Test-Path (Join-Path $DataDir "PG_VERSION")) {
      if (Test-ServerRunning) {
        & $Psql "postgresql://${DbUser}:${DbPassword}@localhost:$Port/$DbName" -c "SELECT current_database(), current_user;"
      } else {
        Write-Host "Local PostgreSQL is not running."
        exit 1
      }
    } else {
      Write-Host "Local PostgreSQL data directory does not exist yet."
      exit 1
    }
  }
}
