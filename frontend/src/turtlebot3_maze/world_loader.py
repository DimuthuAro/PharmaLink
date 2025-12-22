import math
import os
import xml.etree.ElementTree as ET
from typing import Dict, Optional, Tuple

from maze_generator import MazeGenerator, MazeWall


def _parse_pose(text: Optional[str]) -> Tuple[float, float, float, float, float, float]:
    if not text:
        return 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
    parts = [float(val) for val in text.strip().split()]
    while len(parts) < 6:
        parts.append(0.0)
    return tuple(parts[:6])  # type: ignore[return-value]


def load_maze_from_world(
    world_filename: str,
    *,
    base_path: Optional[str] = None,
    robot_radius: float = 0.15,
    default_start: Optional[Tuple[float, float]] = None,
    default_goal: Optional[Tuple[float, float]] = None,
) -> Optional[MazeGenerator]:
    """Create a MazeGenerator instance from an SDF world file."""
    base = base_path or os.path.dirname(os.path.abspath(world_filename))
    path = world_filename if base_path is None else os.path.join(base_path, world_filename)

    try:
        tree = ET.parse(path)
    except FileNotFoundError:
        print(f"World file not found: {path}")
        return None
    except ET.ParseError as exc:
        print(f"Failed to parse world file {path}: {exc}")
        return None

    root = tree.getroot()
    world_elem = root.find('world')
    if world_elem is None:
        print(f"No <world> element in {path}")
        return None

    walls_info = []
    min_x = float('inf')
    max_x = float('-inf')
    min_y = float('inf')
    max_y = float('-inf')

    for model in world_elem.findall('model'):
        size_elem = model.find('./link/collision/geometry/box/size')
        if size_elem is None:
            size_elem = model.find('./link/visual/geometry/box/size')
        if size_elem is None:
            continue

        try:
            size_vals = [float(val) for val in size_elem.text.strip().split()[:3]]
        except (AttributeError, ValueError):
            continue

        pose = _parse_pose(model.findtext('pose'))
        px, py, _pz, _roll, _pitch, yaw = pose

        sx, sy, sz = size_vals if len(size_vals) == 3 else (size_vals + [0.5])[:3]

        horizontal = abs(math.cos(yaw)) >= abs(math.sin(yaw))
        if horizontal:
            length = sx
            thickness = sy
            half_x = sx / 2.0
            half_y = sy / 2.0
            orientation = 'horizontal'
        else:
            length = sy
            thickness = sx
            half_x = sy / 2.0
            half_y = sx / 2.0
            orientation = 'vertical'

        color_elem = model.find('./link/visual/material/diffuse')
        if color_elem is not None and color_elem.text:
            try:
                color_vals = [float(val) for val in color_elem.text.strip().split()[:3]]
                color = tuple(color_vals)
            except ValueError:
                color = (0.7, 0.3, 0.3)
        else:
            color = (0.7, 0.3, 0.3)

        walls_info.append({
            'name': model.get('name', f'wall_{len(walls_info)}'),
            'x': px,
            'y': py,
            'length': length,
            'thickness': thickness,
            'height': sz,
            'orientation': orientation,
            'color': color,
        })

        min_x = min(min_x, px - half_x)
        max_x = max(max_x, px + half_x)
        min_y = min(min_y, py - half_y)
        max_y = max(max_y, py + half_y)

    if not walls_info:
        print(f"No walls found in world file {path}")
        return None

    width = max(max_x - min_x, 1.0)
    height = max(max_y - min_y, 1.0)

    maze = MazeGenerator(width=width, height=height)
    maze.walls = []
    for info in walls_info:
        maze.walls.append(MazeWall(
            info['name'],
            info['x'],
            info['y'],
            info['length'],
            thickness=info['thickness'],
            height=info['height'],
            orientation=info['orientation'],
            color=info['color'],
        ))

    maze.markers = []
    buffer = max(robot_radius * 1.5, 0.05)
    start = default_start if default_start else (min_x + buffer, min_y + buffer)
    goal = default_goal if default_goal else (max_x - buffer, max_y - buffer)

    maze.add_start(start[0], start[1], 'start_marker')
    maze.add_goal(goal[0], goal[1], 'goal_marker')

    # Store useful metadata for callers that need the extents.
    metadata: Dict[str, Tuple[float, float]] = {
        'bounds_min': (min_x, min_y),
        'bounds_max': (max_x, max_y),
    }
    maze.metadata = metadata  # type: ignore[attr-defined]
    maze.world_file = path  # type: ignore[attr-defined]

    return maze
