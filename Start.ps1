# PharmaLink - GUI Service Manager
# Windows Forms GUI to manage all services

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get working directory at script level (before any function calls)
$script:workingDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($script:workingDir)) {
    $script:workingDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if ([string]::IsNullOrEmpty($script:workingDir)) {
    $script:workingDir = (Get-Location).Path
}

# Track running processes
$script:processes = @{
    Backend   = $null
    Frontend  = $null
    MLService = $null
}

$script:isRunning = @{
    Backend   = $false
    Frontend  = $false
    MLService = $false
}

# Colors for professional look
$backgroundColor = [System.Drawing.Color]::FromArgb(240, 242, 245)
$cardColor = [System.Drawing.Color]::White
$primaryColor = [System.Drawing.Color]::FromArgb(41, 128, 185)
$successColor = [System.Drawing.Color]::FromArgb(39, 174, 96)
$dangerColor = [System.Drawing.Color]::FromArgb(231, 76, 60)
$warningColor = [System.Drawing.Color]::FromArgb(241, 196, 15)
$textColor = [System.Drawing.Color]::FromArgb(52, 73, 94)
$mutedColor = [System.Drawing.Color]::FromArgb(149, 165, 166)
$borderColor = [System.Drawing.Color]::FromArgb(220, 220, 220)

# Store buttons reference
$script:serviceButtons = @{}
$script:statusLabels = @{}
$script:statusBoxes = @{}

# Create main form
$form = New-Object System.Windows.Forms.Form
$form.Text = 'PharmaLink Service Manager v1.0'
$form.Size = New-Object System.Drawing.Size(600, 600)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.BackColor = $backgroundColor
$form.Icon = [System.Drawing.SystemIcons]::Application
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

# Header Panel
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Size = New-Object System.Drawing.Size(600, 100)
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.BackColor = $primaryColor
$form.Controls.Add($headerPanel)

# Title Label
$title = New-Object System.Windows.Forms.Label
$title.Text = 'PHARMALINK'
$title.Font = New-Object System.Drawing.Font('Segoe UI', 26, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = [System.Drawing.Color]::White
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(30, 25)
$headerPanel.Controls.Add($title)

# Subtitle Label
$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = 'Integrated Service Management Console'
$subtitle.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 220)
$subtitle.AutoSize = $true
$subtitle.Location = New-Object System.Drawing.Point(33, 75)
$headerPanel.Controls.Add($subtitle)

# Status bar at bottom
$statusBar = New-Object System.Windows.Forms.Panel
$statusBar.Size = New-Object System.Drawing.Size(600, 30)
$statusBar.Location = New-Object System.Drawing.Point(0, 535)
$statusBar.BackColor = [System.Drawing.Color]::FromArgb(52, 73, 94)
$form.Controls.Add($statusBar)

$script:statusLabel = New-Object System.Windows.Forms.Label
$script:statusLabel.Text = 'Ready'
$script:statusLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$script:statusLabel.ForeColor = [System.Drawing.Color]::White
$script:statusLabel.AutoSize = $true
$script:statusLabel.Location = New-Object System.Drawing.Point(15, 7)
$statusBar.Controls.Add($script:statusLabel)

# Function to update status
function Update-Status {
    param($message)
    $script:statusLabel.Text = $message
    $form.Refresh()
}

# Function to create service card
function Create-ServiceCard {
    param($cardTitle, $description, $port, $y, $tag)
    
    # Main card panel
    $card = New-Object System.Windows.Forms.Panel
    $card.Size = New-Object System.Drawing.Size(540, 100)
    $card.Location = New-Object System.Drawing.Point(30, $y)
    $card.BackColor = $cardColor
    $card.BorderStyle = 'FixedSingle'
    
    # Status indicator box
    $statusBox = New-Object System.Windows.Forms.Panel
    $statusBox.Size = New-Object System.Drawing.Size(10, 100)
    $statusBox.Location = New-Object System.Drawing.Point(0, 0)
    $statusBox.BackColor = $mutedColor
    $card.Controls.Add($statusBox)
    $script:statusBoxes[$tag] = $statusBox
    
    # Service icon
    $icon = New-Object System.Windows.Forms.Label
    $icon.Text = '[S]'
    $icon.Font = New-Object System.Drawing.Font('Consolas', 16, [System.Drawing.FontStyle]::Bold)
    $icon.ForeColor = $primaryColor
    $icon.AutoSize = $true
    $icon.Location = New-Object System.Drawing.Point(25, 15)
    $card.Controls.Add($icon)
    
    # Service title
    $titleLabel = New-Object System.Windows.Forms.Label
    $titleLabel.Text = $cardTitle
    $titleLabel.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
    $titleLabel.ForeColor = $textColor
    $titleLabel.AutoSize = $true
    $titleLabel.Location = New-Object System.Drawing.Point(70, 15)
    $card.Controls.Add($titleLabel)
    
    # Service description
    $descLabel = New-Object System.Windows.Forms.Label
    $descLabel.Text = $description
    $descLabel.Font = New-Object System.Drawing.Font('Segoe UI', 9)
    $descLabel.ForeColor = $mutedColor
    $descLabel.AutoSize = $true
    $descLabel.Location = New-Object System.Drawing.Point(70, 40)
    $card.Controls.Add($descLabel)
    
    # Port label
    $portLabel = New-Object System.Windows.Forms.Label
    $portLabel.Text = "PORT: $port"
    $portLabel.Font = New-Object System.Drawing.Font('Consolas', 9, [System.Drawing.FontStyle]::Bold)
    $portLabel.ForeColor = $primaryColor
    $portLabel.AutoSize = $true
    $portLabel.Location = New-Object System.Drawing.Point(70, 65)
    $card.Controls.Add($portLabel)
    
    # Status text
    $statusText = New-Object System.Windows.Forms.Label
    $statusText.Text = 'STOPPED'
    $statusText.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
    $statusText.ForeColor = $mutedColor
    $statusText.AutoSize = $true
    $statusText.Location = New-Object System.Drawing.Point(350, 20)
    $card.Controls.Add($statusText)
    $script:statusLabels[$tag] = $statusText
    
    # Action button
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = 'START'
    $btn.Size = New-Object System.Drawing.Size(100, 35)
    $btn.Location = New-Object System.Drawing.Point(420, 15)
    $btn.FlatStyle = 'Flat'
    $btn.BackColor = $successColor
    $btn.ForeColor = [System.Drawing.Color]::White
    $btn.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $btn.Cursor = 'Hand'
    $btn.Tag = $tag
    $btn.FlatAppearance.BorderSize = 0
    $btn.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(30, 130, 76)
    $btn.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(25, 111, 61)
    $script:serviceButtons[$tag] = $btn
    
    $btn.Add_Click({
        $serviceName = $this.Tag
        Toggle-Service -serviceName $serviceName -button $this
    })
    
    # Install button
    $installBtn = New-Object System.Windows.Forms.Button
    $installBtn.Text = 'INSTALL && START'
    $installBtn.Size = New-Object System.Drawing.Size(140, 35)
    $installBtn.Location = New-Object System.Drawing.Point(380, 55)
    $installBtn.FlatStyle = 'Flat'
    $installBtn.BackColor = [System.Drawing.Color]::FromArgb(0, 122, 204)          # BlueCOLOR
    $installBtn.ForeColor = [System.Drawing.Color]::White
    $installBtn.Font = New-Object System.Drawing.Font('Segoe UI', 9)
    $installBtn.Cursor = 'Hand'
    $installBtn.Tag = $tag
    $installBtn.FlatAppearance.BorderSize = 0
    $installBtn.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(223, 172, 10)
    $installBtn.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(196, 150, 11)
    
    $installBtn.Add_Click({
        $serviceName = $this.Tag
        Install-Service -serviceName $serviceName -button $this
    })
    
    $card.Controls.Add($btn)
    $card.Controls.Add($installBtn)
    
    return $card
}

# Toggle service function
function Toggle-Service {
    param($serviceName, $button)
    
    if ($script:isRunning[$serviceName]) {
        # Stop service
        Update-Status "Stopping $serviceName..."
        
        if ($script:processes[$serviceName] -ne $null) {
            try {
                Stop-Process -Id $script:processes[$serviceName].Id -Force -ErrorAction SilentlyContinue
            }
            catch {}
        }
        
        $script:isRunning[$serviceName] = $false
        $button.Text = 'START'
        $button.BackColor = $successColor
        $button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(30, 130, 76)
        $script:statusLabels[$serviceName].Text = 'STOPPED'
        $script:statusLabels[$serviceName].ForeColor = $mutedColor
        $script:statusBoxes[$serviceName].BackColor = $mutedColor
        Update-Status "$serviceName stopped"
    }
    else {
        # Start service
        Update-Status "Starting $serviceName..."
        
        $serviceDir = switch ($serviceName) {
            'Backend' { Join-Path $script:workingDir "backend" }
            'Frontend' { Join-Path $script:workingDir "frontend" }
            'MLService' { Join-Path $script:workingDir "ml_service" }
        }
        
        $runCmd = switch ($serviceName) {
            'Backend' { "npm run dev" }
            'Frontend' { "npm run dev" }
            'MLService' { "pip install -r requirements.txt & uvicorn main:app --host 0.0.0.0 --port 8000 --reload" }
        }
        
        $windowTitle = switch ($serviceName) {
            'Backend' { "PharmaLink Backend (Port 3000)" }
            'Frontend' { "PharmaLink Frontend (Port 5173)" }
            'MLService' { "PharmaLink ML Service (Port 8000)" }
        }
        
        $script:processes[$serviceName] = Start-Process -FilePath "cmd.exe" -ArgumentList "/k title $windowTitle & cd /d `"$serviceDir`" & $runCmd" -PassThru
        $script:isRunning[$serviceName] = $true
        $button.Text = 'STOP'
        $button.BackColor = $dangerColor
        $button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(210, 50, 45)
        $script:statusLabels[$serviceName].Text = 'RUNNING'
        $script:statusLabels[$serviceName].ForeColor = $successColor
        $script:statusBoxes[$serviceName].BackColor = $successColor
        Update-Status "$serviceName started successfully"
    }
    
    Update-AllButton
}

# Install service function
function Install-Service {
    param($serviceName, $button)
    
    Update-Status "Installing dependencies for $serviceName..."
    
    $serviceDir = switch ($serviceName) {
        'Backend' { Join-Path $script:workingDir "backend" }
        'Frontend' { Join-Path $script:workingDir "frontend" }
        'MLService' { Join-Path $script:workingDir "ml_service" }
    }
    
    $installCmd = switch ($serviceName) {
        'Backend' { "echo. | npm install & npm run dev" } # New Line added to prevent npm from hanging on some systems
        'Frontend' { "echo. | npm install & npm run dev" }
        'MLService' { "pip install -r requirements.txt" }
    }
        
    $windowTitle = "$serviceName - Installing Dependencies"
    
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k title $windowTitle & cd /d `"$serviceDir`" & $installCmd & echo. & echo Installation complete! Press any key to close... & pause & exit"
    
    Update-Status "$serviceName installation started in new window"
}

# Update Start All button state
function Update-AllButton {
    $allRunning = $script:isRunning['Backend'] -and $script:isRunning['Frontend'] -and $script:isRunning['MLService']
    
    if ($allRunning) {
        $script:btnAll.Text = 'STOP ALL SERVICES'
        $script:btnAll.BackColor = $dangerColor
        $script:btnAll.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(210, 50, 45)
    }
    else {
        $script:btnAll.Text = 'START ALL SERVICES'
        $script:btnAll.BackColor = $primaryColor
        $script:btnAll.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(52, 152, 219)
    }
}

# Function to check if processes are still running (for real-time monitoring)
function Check-ProcessStatus {
    foreach ($serviceName in @('Backend', 'Frontend', 'MLService')) {
        if ($script:isRunning[$serviceName]) {
            $proc = $script:processes[$serviceName]
            if ($proc -ne $null) {
                try {
                    # Check if process has exited
                    if ($proc.HasExited) {
                        # Process was closed manually - update UI
                        $script:isRunning[$serviceName] = $false
                        $script:processes[$serviceName] = $null
                        
                        # Update button
                        $button = $script:serviceButtons[$serviceName]
                        if ($button -ne $null) {
                            $button.Text = 'START'
                            $button.BackColor = $successColor
                            $button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(30, 130, 76)
                        }
                        
                        # Update status label
                        if ($script:statusLabels[$serviceName] -ne $null) {
                            $script:statusLabels[$serviceName].Text = 'STOPPED'
                            $script:statusLabels[$serviceName].ForeColor = $mutedColor
                        }
                        
                        # Update status box
                        if ($script:statusBoxes[$serviceName] -ne $null) {
                            $script:statusBoxes[$serviceName].BackColor = $mutedColor
                        }
                        
                        Update-Status "$serviceName was closed externally"
                        Update-AllButton
                    }
                }
                catch {
                    # Process object is invalid - mark as stopped
                    $script:isRunning[$serviceName] = $false
                    $script:processes[$serviceName] = $null
                }
            }
        }
    }
}

# Add service cards
$yPos = 120
$form.Controls.Add((Create-ServiceCard 'Backend API' 'Express.js REST API with MongoDB' '3000' $yPos 'Backend'))
$yPos += 110
$form.Controls.Add((Create-ServiceCard 'Frontend Application' 'Vite + React User Interface' '5173' $yPos 'Frontend'))
$yPos += 110
$form.Controls.Add((Create-ServiceCard 'ML Service' 'FastAPI Machine Learning Service' '8000' $yPos 'MLService'))

# Control Panel
$controlPanel = New-Object System.Windows.Forms.Panel
$controlPanel.Size = New-Object System.Drawing.Size(540, 60)
$controlPanel.Location = New-Object System.Drawing.Point(30, 460)
$controlPanel.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
$controlPanel.BorderStyle = 'FixedSingle'
$form.Controls.Add($controlPanel)

# Start All button
$script:btnAll = New-Object System.Windows.Forms.Button
$script:btnAll.Text = 'START ALL SERVICES'
$script:btnAll.Size = New-Object System.Drawing.Size(160, 40)
$script:btnAll.Location = New-Object System.Drawing.Point(20, 10)
$script:btnAll.FlatStyle = 'Flat'
$script:btnAll.BackColor = $primaryColor
$script:btnAll.ForeColor = [System.Drawing.Color]::White
$script:btnAll.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$script:btnAll.Cursor = 'Hand'
$script:btnAll.FlatAppearance.BorderSize = 0
$script:btnAll.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(52, 152, 219)
$script:btnAll.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(41, 128, 185)
$script:btnAll.Add_Click({
    $allRunning = $script:isRunning['Backend'] -and $script:isRunning['Frontend'] -and $script:isRunning['MLService']
    
    if ($allRunning) {
        # Stop all services
        Update-Status "Stopping all services..."
        foreach ($service in @('MLService', 'Frontend', 'Backend')) {
            if ($script:isRunning[$service]) {
                Toggle-Service -serviceName $service -button $script:serviceButtons[$service]
                Start-Sleep -Milliseconds 500
            }
        }
        Update-Status "All services stopped"
    }
    else {
        # Start all services (ML first, then Backend, then Frontend)
        Update-Status "Starting all services..."
        foreach ($service in @('MLService', 'Backend', 'Frontend')) {
            if (-not $script:isRunning[$service]) {
                Toggle-Service -serviceName $service -button $script:serviceButtons[$service]
                Start-Sleep -Seconds 2
            }
        }
        Update-Status "All services started successfully"
    }
})

# Install & Start All button click event
$script:btnAllInstall = New-Object System.Windows.Forms.Button
$script:btnAllInstall.Text = 'INSTALL & RUN ALL'
$script:btnAllInstall.Size = New-Object System.Drawing.Size(160, 40)
$script:btnAllInstall.Location = New-Object System.Drawing.Point(200, 10)
$script:btnAllInstall.FlatStyle = 'Flat'
$script:btnAllInstall.BackColor = $warningColor
$script:btnAllInstall.ForeColor = [System.Drawing.Color]::White
$script:btnAllInstall.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$script:btnAllInstall.Cursor = 'Hand'
$script:btnAllInstall.FlatAppearance.BorderSize = 0
$script:btnAllInstall.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(223, 172, 10)
$script:btnAllInstall.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(196, 150, 11)
$script:btnAllInstall.Add_Click({
    Update-Status "Installing dependencies for all services..."
    
    foreach ($service in @('MLService', 'Backend', 'Frontend')) {
        Install-Service -serviceName $service -button $null
        Start-Sleep -Seconds 2
    }
    
    Update-Status "All installation processes started in separate windows"
})




$controlPanel.Controls.Add($script:btnAll)
$controlPanel.Controls.Add($script:btnAllInstall)

# Exit button
$exitBtn = New-Object System.Windows.Forms.Button
$exitBtn.Text = 'EXIT'
$exitBtn.Size = New-Object System.Drawing.Size(100, 40)
$exitBtn.Location = New-Object System.Drawing.Point(420, 10)
$exitBtn.FlatStyle = 'Flat'
$exitBtn.BackColor = [System.Drawing.Color]::FromArgb(149, 165, 166)
$exitBtn.ForeColor = [System.Drawing.Color]::White
$exitBtn.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$exitBtn.Cursor = 'Hand'
$exitBtn.FlatAppearance.BorderSize = 0
$exitBtn.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(127, 140, 141)

$exitBtn.Add_Click({
    $form.Close()
})

$controlPanel.Controls.Add($exitBtn)

# Handle form closing - cleanup processes
$form.Add_FormClosing({
    $runningServices = @()
    foreach ($service in @('MLService', 'Frontend', 'Backend')) {
        if ($script:isRunning[$service]) {
            $runningServices += $service
        }
    }
    
    if ($runningServices.Count -gt 0) {
        $result = [System.Windows.Forms.MessageBox]::Show(
            "The following services are still running:`n`n$($runningServices -join ', ')`n`nDo you want to stop them before exiting?",
            "Running Services Detected",
            [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
    
        if ($result -eq 'Cancel') {
            $_.Cancel = $true
            return
        }
    
        if ($result -eq 'Yes') {
            foreach ($service in @('MLService', 'Frontend', 'Backend')) {
                if ($script:processes[$service] -ne $null) {
                    try {
                        Stop-Process -Id $script:processes[$service].Id -Force -ErrorAction SilentlyContinue
                    }
                    catch {}
                }
            }
        }
    }
})

# Create process monitor timer (checks every 1 second)
$script:processMonitor = New-Object System.Windows.Forms.Timer
$script:processMonitor.Interval = 1000  # 1 second
$script:processMonitor.Add_Tick({
    Check-ProcessStatus
})
$script:processMonitor.Start()

# Show the form
Update-Status "PharmaLink Service Manager Ready"
[void]$form.ShowDialog()

# Clean up timer when form closes
$script:processMonitor.Stop()
$script:processMonitor.Dispose()