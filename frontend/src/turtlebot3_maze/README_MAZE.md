# Custom Maze Environment for TurtleBot3

This package contains a customizable maze environment for simulating TurtleBot3 navigation in Gazebo.

## Maze Features

- **Custom Maze Layout**: Pre-configured 10x10 meter maze with interior walls
- **Start and Goal Markers**: Color-coded markers (blue for start, green for goal)
- **Boundary Walls**: Enclosed maze environment
- **Customizable Design**: Python script to generate different maze configurations

## Maze Structure

### Current Maze Layout
- **Dimensions**: 10m x 10m
- **Wall Height**: 0.5m
- **Interior Walls**: Multiple segments creating a challenging path for navigation
- **Start Position**: (-4.0, -3.5) - marked with blue cylinder
- **Goal Position**: (4.0, 3.5) - marked with green cylinder

### Maze Components

#### Boundary Walls
- **North Wall**: y=5.0, spanning x from -5 to 5
- **South Wall**: y=-5.0, spanning x from -5 to 5
- **East Wall**: x=5.0, spanning y from -5 to 5
- **West Wall**: x=-5.0, spanning y from -5 to 5

#### Interior Walls
1. **wall_1**: Vertical wall at (-2.0, 2.0), length 3.0m
2. **wall_2**: Vertical wall at (2.0, 1.0), length 3.0m
3. **wall_3**: Horizontal wall at (-1.0, -1.5), length 2.5m
4. **wall_4**: Horizontal wall at (3.0, -2.5), length 2.0m
5. **wall_5**: Horizontal wall at (-3.5, 0.5), length 2.0m

## Usage

### Launch the Maze Environment

```bash
cd ~/turtlebot3_ws
source install/setup.bash
export TURTLEBOT3_MODEL=burger

# Launch SLAM for mapping
ros2 launch turtlebot3_maze slam.launch.py

# In another terminal - manual control
ros2 run turtlebot3_teleop teleop_keyboard

# In another terminal - run DQN navigation
ros2 run turtlebot3_maze dqn_navigation
```

### Generate Custom Mazes

#### Simple Maze
```bash
python3 ~/turtlebot3_ws/src/turtlebot3_maze/maze_generator.py --type simple --output ~/turtlebot3_ws/src/turtlebot3_maze/worlds/maze.world
```

#### Complex Maze
```bash
python3 ~/turtlebot3_ws/src/turtlebot3_maze/maze_generator.py --type complex --output ~/turtlebot3_ws/src/turtlebot3_maze/worlds/maze.world
```

#### Custom Maze (Python)
```python
from maze_generator import MazeGenerator

# Create a custom maze
maze = MazeGenerator(width=15.0, height=15.0)

# Add walls
maze.add_wall(x=2.0, y=1.0, length=4.0, orientation="horizontal")
maze.add_wall(x=-1.0, y=-2.0, length=3.0, orientation="vertical")

# Add markers
maze.add_start(x=-6.0, y=-6.0)
maze.add_goal(x=6.0, y=6.0)

# Save
maze.save("worlds/my_maze.world")
```

## Maze Generator API

### MazeGenerator Class
```python
MazeGenerator(width=10.0, height=10.0, boundary_height=0.5, boundary_thickness=0.2)
```

**Methods:**
- `add_wall(x, y, length, orientation="horizontal")` - Add a wall to the maze
- `add_goal(x, y, name="goal")` - Add a goal marker
- `add_start(x, y, name="start")` - Add a start marker
- `generate_sdf()` - Generate SDF XML string
- `save(filepath)` - Save maze to SDF file

### MazeWall Class
```python
MazeWall(name, x, y, length, thickness=0.1, height=0.5, 
         orientation="horizontal", color=(0.7, 0.3, 0.3))
```

**Parameters:**
- `name`: Unique wall identifier
- `x, y`: Center position
- `length`: Wall length in meters
- `thickness`: Wall thickness (default: 0.1m)
- `height`: Wall height (default: 0.5m)
- `orientation`: "horizontal" or "vertical"
- `color`: RGB tuple (0.0-1.0 range)

### MazeMarker Class
```python
MazeMarker(name, x, y, radius=0.3, color=(0.2, 0.8, 0.2))
```

**Parameters:**
- `name`: Unique marker identifier
- `x, y`: Center position
- `radius`: Marker radius (default: 0.3m)
- `color`: RGB tuple for visualization

## Coordinate System

The maze uses the standard ROS coordinate system:
- **X-axis**: Points forward (East)
- **Y-axis**: Points left (North)
- **Z-axis**: Points up

## Customization Tips

### Creating Your Own Maze

1. **Sketch your layout** on paper with coordinates
2. **Create a MazeGenerator** instance
3. **Add walls** using coordinates and lengths
4. **Add markers** for start and goal
5. **Save** to a world file

### Wall Placement Tips

- Use `orientation="horizontal"` for walls parallel to X-axis
- Use `orientation="vertical"` for walls parallel to Y-axis
- Wall length is the total dimension in the direction it extends
- Thickness affects collision properties but is usually small (0.1m)

### Performance Considerations

- Fewer walls = faster simulation
- Keep walls at least 0.5m from boundaries
- Ensure navigation paths exist between start and goal
- Test maze for TurtleBot3 accessibility (minimum 0.3m width)

## Troubleshooting

### Robot gets stuck in maze
- Ensure walls have at least 0.3m gaps for TurtleBot3 to pass through
- Verify start and goal positions are reachable
- Check wall coordinates and orientations

### Physics simulation is slow
- Reduce number of walls
- Simplify maze structure
- Increase `max_step_size` in physics settings (trade-off with accuracy)

### Walls not visible in RViz
- Check material colors in maze.world
- Ensure walls have both collision and visual elements
- Verify Gazebo is publishing to ROS

## Files

- `maze.world` - Main maze world file (SDF format)
- `maze_generator.py` - Python script to generate custom mazes
- `launch/slam.launch.py` - Launch SLAM mapping
- `launch/navigation.launch.py` - Launch navigation stack
- `dqn_navigation.py` - DQN-based navigation node
