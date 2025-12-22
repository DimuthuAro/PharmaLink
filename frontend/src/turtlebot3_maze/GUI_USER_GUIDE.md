# TurtleBot3 Maze GUI - User Guide

## 🎨 Overview

A modern GUI application for creating and customizing TurtleBot3 maze environments without writing code.

## ✨ Features

- **Visual Maze Editor** - Graphical representation of your maze
- **Interactive Controls** - Add walls and markers with simple clicks
- **Real-time Preview** - See changes instantly
- **Preset Loader** - Load pre-configured maze layouts
- **File Management** - Save and load custom mazes
- **Maze Information** - View current maze statistics

## 🚀 Getting Started

### Launch the GUI

```bash
cd ~/turtlebot3_ws/src/turtlebot3_maze
python3 maze_gui.py
```

### Main Window Layout

```
┌─────────────────────────────────────────────────────┐
│ Maze Designer                                       │
├─────────────────┬─────────────────────────────────┤
│                 │                                 │
│  Controls       │      Canvas Preview             │
│  Panel          │      (Visual Maze Editor)       │
│  (Left)         │                                 │
│                 │                                 │
│  - Maze Size    │                                 │
│  - Add Walls    │                                 │
│  - Add Markers  │                                 │
│  - File Ops     │                                 │
│  - Maze Info    │                                 │
│                 │                                 │
└─────────────────┴─────────────────────────────────┘
```

## 🎮 How to Use

### 1. Create a New Maze

1. Set desired width and height (5-30 meters)
2. Click **"Create Maze"** button
3. A new 10×10m maze is created with boundary walls

### 2. Add Walls

1. Enter wall coordinates (X, Y)
2. Set wall length
3. Choose orientation: **Horizontal** or **Vertical**
4. Click **"Add Wall"** button
5. Wall appears on canvas

#### Wall Placement Example
```
Width: 10m, Height: 10m
Wall 1: X=2.0, Y=0.0, Length=4.0, Horizontal
Wall 2: X=0.0, Y=2.0, Length=3.0, Vertical
```

### 3. Add Start and Goal Markers

**Start Marker (Blue):**
1. Enter Start X and Y coordinates
2. Click **"Add Start"** button

**Goal Marker (Green):**
1. Enter Goal X and Y coordinates
2. Click **"Add Goal"** button

#### Marker Example
```
Start: X=-4.0, Y=-4.0 (blue cylinder)
Goal:  X=4.0, Y=4.0   (green cylinder)
```

### 4. Load Preset Mazes

1. Click **"Load Preset"** button
2. Select from available presets:
   - Simple (⭐⭐)
   - Corridor (⭐⭐)
   - Grid (⭐⭐⭐)
   - Spiral (⭐⭐⭐)
   - Challenge (⭐⭐⭐⭐⭐)

### 5. Save Your Maze

1. Click **"Save Maze"** button
2. Choose location and filename
3. File is saved as `.world` format
4. Can be immediately used in Gazebo

### 6. View Maze Information

The right side panel shows:
- Maze dimensions
- Total walls (boundary + interior)
- Marker positions
- Real-time updates

## 🎨 Canvas Visualization

### Visual Elements

**Grid Background:**
- Light gray grid lines at 5m intervals
- Helps with coordinate estimation

**Walls:**
- Boundary walls: Dark gray lines
- Interior walls: Red lines
- Width indicates 3D representation

**Markers:**
- Start: Blue circles with "S" label
- Goal: Green circles with "G" label

**Coordinate Axes:**
- Red line: X-axis (East-West)
- Green line: Y-axis (North-South)
- Black dot: Origin (0, 0)

## 📐 Coordinate System

```
        North (Y+)
            ↑
            │
West ←──┼──→ East (X+)
  (X-) │    (X+)
       │
    South (Y-)
```

## 💡 Tips

### Maze Design
- **Minimum passage width:** 0.4m (for TurtleBot3 to pass)
- **Recommended width:** 0.5-1.0m for safe navigation
- **Maximum maze size:** 20×20m (for real-time simulation)
- **Wall height:** Fixed at 0.5m (standard)

### Testing Mazes
1. Save your maze
2. Launch Gazebo: `ros2 launch turtlebot3_maze slam.launch.py`
3. Use teleop to test: `ros2 run turtlebot3_teleop teleop_keyboard`
4. Verify all paths are accessible

### Performance
- Fewer walls = faster simulation
- Simpler geometric layouts perform better
- Keep distance from boundaries

## 🎯 Example Workflows

### Create a Simple Maze from Scratch

```
1. Launch GUI
2. Create 10×10m maze
3. Add walls:
   - Wall 1: X=2.0, Y=0.0, Length=4.0, Horizontal
   - Wall 2: X=0.0, Y=2.0, Length=4.0, Vertical
   - Wall 3: X=-2.0, Y=-2.0, Length=3.0, Horizontal
4. Add markers:
   - Start: X=-3.5, Y=-3.5
   - Goal: X=3.5, Y=3.5
5. Save as: "my_maze.world"
6. Use in simulation
```

### Modify a Preset Maze

```
1. Load preset (e.g., "Grid")
2. Add additional walls where needed
3. Adjust marker positions
4. Save with new name
5. Test in simulation
```

## ⚙️ Configuration

### Canvas Scaling
- Default scale: 30 pixels/meter
- Can be modified in `MazeCanvas` class (line: `self.scale = 30`)

### Color Scheme
- Boundary walls: RGB(0.3, 0.3, 0.3) - Dark gray
- Interior walls: RGB(0.7, 0.3, 0.3) - Red
- Start marker: RGB(0.2, 0.2, 0.8) - Blue
- Goal marker: RGB(0.2, 0.8, 0.2) - Green

## 🐛 Troubleshooting

### GUI Won't Launch
```bash
# Check Python version (requires 3.6+)
python3 --version

# Install tkinter if missing
sudo apt install python3-tk
```

### Canvas Not Updating
- Click **"Create Maze"** to refresh
- Verify wall coordinates are within bounds

### Can't Save File
- Check directory permissions
- Ensure path exists
- Use absolute file paths

### Maze not loading in Gazebo
- Verify `.world` file extension
- Check file path in launch file
- Ensure walls don't overlap boundaries

## 📋 Keyboard Shortcuts

Currently supported via menu buttons. Keyboard shortcuts planned for future versions.

## 🔧 Advanced

### Modify Canvas Scale
Edit `maze_gui.py`, line ~30:
```python
self.scale = 30  # Change to 40, 50, etc.
```

### Add Custom Colors
Edit colors in wall/marker creation:
```python
self.maze.add_wall(x, y, length, color=(1.0, 0.5, 0.0))  # Orange
```

## 📞 Support

For issues:
1. Check console for error messages
2. Verify Python version >= 3.6
3. Ensure all dependencies installed
4. Review maze coordinates

## 🚀 Next Steps

After creating a maze:

1. **Launch Simulation:**
   ```bash
   ros2 launch turtlebot3_maze slam.launch.py
   ```

2. **Manual Testing:**
   ```bash
   ros2 run turtlebot3_teleop teleop_keyboard
   ```

3. **Save Map:**
   ```bash
   ros2 run nav2_map_server map_saver_cli -f ~/maps/my_maze
   ```

4. **Run Navigation:**
   ```bash
   ros2 run turtlebot3_maze dqn_navigation
   ```

---

**Version**: 1.0  
**Last Updated**: 2025-10-18  
**Status**: Production Ready ✓
