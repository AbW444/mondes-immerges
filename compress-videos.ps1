# ============================================================
# Script de compression vidéo - Max 20 Mo par fichier
# Nécessite ffmpeg (https://ffmpeg.org/download.html)
# Usage: .\compress-videos.ps1
# ============================================================

$repoRoot = "E:\projets_hso\mondes-immerges\git"
$maxSizeMB = 20
$maxSizeBytes = $maxSizeMB * 1024 * 1024

# Scan automatique : tous les .mp4 et .webm > maxSizeMB dans le repo
$files = Get-ChildItem -Path $repoRoot -Recurse -Include *.mp4,*.webm |
    Where-Object { $_.Length -gt $maxSizeBytes -and $_.FullName -notmatch '\.backup\.' -and $_.FullName -notmatch 'node_modules' -and $_.FullName -notmatch '\\dist\\' } |
    ForEach-Object { $_.FullName.Substring($repoRoot.Length + 1) }

# Vérifier ffmpeg
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR: ffmpeg non trouvé. Installe-le: https://ffmpeg.org/download.html" -ForegroundColor Red
    exit 1
}

Write-Host "=== Compression videos > ${maxSizeMB}Mo ===" -ForegroundColor Cyan
Write-Host ""

foreach ($relPath in $files) {
    $fullPath = Join-Path $repoRoot $relPath

    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP: $relPath (fichier introuvable)" -ForegroundColor Yellow
        continue
    }

    $fileSize = (Get-Item $fullPath).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 1)

    if ($fileSize -le $maxSizeBytes) {
        Write-Host "OK: $relPath (${fileSizeMB}Mo <= ${maxSizeMB}Mo)" -ForegroundColor Green
        continue
    }

    Write-Host "TRAITEMENT: $relPath (${fileSizeMB}Mo -> max ${maxSizeMB}Mo)" -ForegroundColor Yellow

    # Récupérer la durée de la vidéo
    $duration = & ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$fullPath" 2>$null
    $duration = [double]$duration

    if ($duration -le 0) {
        Write-Host "  ERREUR: impossible de lire la durée" -ForegroundColor Red
        continue
    }

    # Calculer le bitrate cible (en kbps)
    # On vise 19Mo pour avoir de la marge (audio ~64kbps)
    $targetSizeBits = 19 * 1024 * 1024 * 8
    $audioBitrate = 64  # kbps
    $videoBitrate = [math]::Floor(($targetSizeBits / $duration - $audioBitrate * 1000) / 1000)

    # Minimum raisonnable
    if ($videoBitrate -lt 100) { $videoBitrate = 100 }

    Write-Host "  Duree: $([math]::Round($duration, 1))s | Bitrate cible: ${videoBitrate}k" -ForegroundColor Gray

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
    $tempFile = "$fullPath.tmp$ext"
    $backupFile = "$fullPath.backup$ext"

    # Encoder selon le format
    if ($ext -eq ".webm") {
        # VP9 + Opus pour WebM - 2-pass pour précision du bitrate
        Write-Host "  Pass 1/2..." -ForegroundColor Gray
        & ffmpeg -y -i "$fullPath" -c:v libvpx-vp9 -b:v "${videoBitrate}k" -pass 1 -an -f null NUL 2>$null

        Write-Host "  Pass 2/2..." -ForegroundColor Gray
        & ffmpeg -y -i "$fullPath" -c:v libvpx-vp9 -b:v "${videoBitrate}k" -pass 2 -c:a libopus -b:a "${audioBitrate}k" -threads 4 "$tempFile" 2>$null
    }
    else {
        # H.264 + AAC pour MP4 - 2-pass
        Write-Host "  Pass 1/2..." -ForegroundColor Gray
        & ffmpeg -y -i "$fullPath" -c:v libx264 -b:v "${videoBitrate}k" -pass 1 -an -f null NUL 2>$null

        Write-Host "  Pass 2/2..." -ForegroundColor Gray
        & ffmpeg -y -i "$fullPath" -c:v libx264 -b:v "${videoBitrate}k" -pass 2 -c:a aac -b:a "${audioBitrate}k" -movflags +faststart "$tempFile" 2>$null
    }

    # Vérifier le résultat
    if (Test-Path $tempFile) {
        $newSize = (Get-Item $tempFile).Length
        $newSizeMB = [math]::Round($newSize / 1MB, 1)

        if ($newSize -gt 0 -and $newSize -le $maxSizeBytes) {
            # Backup original, remplacer
            Move-Item $fullPath $backupFile -Force
            Move-Item $tempFile $fullPath -Force
            Write-Host "  OK: ${fileSizeMB}Mo -> ${newSizeMB}Mo" -ForegroundColor Green
        }
        elseif ($newSize -gt $maxSizeBytes) {
            # Encore trop gros, réessayer avec bitrate réduit
            $reducedBitrate = [math]::Floor($videoBitrate * 0.75)
            Write-Host "  Encore ${newSizeMB}Mo, retry bitrate ${reducedBitrate}k..." -ForegroundColor Yellow
            Remove-Item $tempFile -Force

            if ($ext -eq ".webm") {
                & ffmpeg -y -i "$fullPath" -c:v libvpx-vp9 -b:v "${reducedBitrate}k" -pass 1 -an -f null NUL 2>$null
                & ffmpeg -y -i "$fullPath" -c:v libvpx-vp9 -b:v "${reducedBitrate}k" -pass 2 -c:a libopus -b:a "${audioBitrate}k" -threads 4 "$tempFile" 2>$null
            } else {
                & ffmpeg -y -i "$fullPath" -c:v libx264 -b:v "${reducedBitrate}k" -pass 1 -an -f null NUL 2>$null
                & ffmpeg -y -i "$fullPath" -c:v libx264 -b:v "${reducedBitrate}k" -pass 2 -c:a aac -b:a "${audioBitrate}k" -movflags +faststart "$tempFile" 2>$null
            }

            if (Test-Path $tempFile) {
                $newSize2 = (Get-Item $tempFile).Length
                $newSizeMB2 = [math]::Round($newSize2 / 1MB, 1)
                Move-Item $fullPath $backupFile -Force
                Move-Item $tempFile $fullPath -Force
                Write-Host "  OK: ${fileSizeMB}Mo -> ${newSizeMB2}Mo" -ForegroundColor Green
            }
        }
        else {
            Write-Host "  ERREUR: fichier résultant vide" -ForegroundColor Red
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }
    }
    else {
        Write-Host "  ERREUR: encodage échoué" -ForegroundColor Red
    }
}

# Nettoyage fichiers temporaires ffmpeg
Remove-Item "$repoRoot\ffmpeg2pass-0.log*" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Terminé ===" -ForegroundColor Cyan
Write-Host "Les originaux sont sauvegardés en .backup" -ForegroundColor Gray
Write-Host "Pour supprimer les backups: Get-ChildItem -Recurse *.backup* | Remove-Item" -ForegroundColor Gray
