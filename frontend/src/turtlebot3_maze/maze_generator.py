#!/usr/bin/env python3
"""
Maze Generator for Gazebo
Generates custom maze configurations in SDF format
"""

from typing import List, Tuple
import xml.etree.ElementTree as ET
from xml.dom import minidom


class MazeWall:
    """Represents a wall in the maze"""
    def __init__(self, name: str, x: float, y: float, length: float, 
                 thickness: float = 0.1, height: float = 0.5, 
                 orientation: str = "horizontal", color: Tuple[float, float, float] = (0.7, 0.3, 0.3)):
        self.name = name
        self.x = x
        self.y = y
        self.length = length
        self.thickness = thickness
        self.height = height
        self.orientation = orientation  # "horizontal" or "vertical"
        self.color = color
    
    def to_xml(self) -> ET.Element:
        """Convert wall to SDF XML element"""
        model = ET.Element("model", {"name": self.name})
        
        # Calculate rotation based on orientation
        rotation_z = 0 if self.orientation == "horizontal" else 1.57
        pose = ET.SubElement(model, "pose")
        pose.text = f"{self.x} {self.y} 0.0 0 0 {rotation_z}"
        
        static = ET.SubElement(model, "static")
        static.text = "true"
        
        link = ET.SubElement(model, "link", {"name": "link"})
        
        # Collision
        collision = ET.SubElement(link, "collision", {"name": "collision"})
        geometry = ET.SubElement(collision, "geometry")
        box = ET.SubElement(geometry, "box")
        
        width = self.length if self.orientation == "horizontal" else self.thickness
        depth = self.thickness if self.orientation == "horizontal" else self.length
        size = ET.SubElement(box, "size")
        size.text = f"{width} {depth} {self.height}"
        
        # Visual
        visual = ET.SubElement(link, "visual", {"name": "visual"})
        geometry = ET.SubElement(visual, "geometry")
        box = ET.SubElement(geometry, "box")
        size = ET.SubElement(box, "size")
        size.text = f"{width} {depth} {self.height}"
        
        material = ET.SubElement(visual, "material")
        diffuse = ET.SubElement(material, "diffuse")
        r, g, b = self.color
        diffuse.text = f"{r} {g} {b} 1"
        
        return model


class MazeMarker:
    """Represents a goal or start marker"""
    def __init__(self, name: str, x: float, y: float, 
                 radius: float = 0.3, color: Tuple[float, float, float] = (0.2, 0.8, 0.2)):
        self.name = name
        self.x = x
        self.y = y
        self.radius = radius
        self.color = color
    
    def to_xml(self) -> ET.Element:
        """Convert marker to SDF XML element"""
        model = ET.Element("model", {"name": self.name})
        
        pose = ET.SubElement(model, "pose")
        pose.text = f"{self.x} {self.y} 0.0 0 0 0"
        
        static = ET.SubElement(model, "static")
        static.text = "true"
        
        link = ET.SubElement(model, "link", {"name": "link"})
        
        # Collision
        collision = ET.SubElement(link, "collision", {"name": "collision"})
        geometry = ET.SubElement(collision, "geometry")
        cylinder = ET.SubElement(geometry, "cylinder")
        
        radius_elem = ET.SubElement(cylinder, "radius")
        radius_elem.text = str(self.radius)
        length_elem = ET.SubElement(cylinder, "length")
        length_elem.text = "0.05"
        
        # Visual
        visual = ET.SubElement(link, "visual", {"name": "visual"})
        geometry = ET.SubElement(visual, "geometry")
        cylinder = ET.SubElement(geometry, "cylinder")
        
        radius_elem = ET.SubElement(cylinder, "radius")
        radius_elem.text = str(self.radius)
        length_elem = ET.SubElement(cylinder, "length")
        length_elem.text = "0.05"
        
        material = ET.SubElement(visual, "material")
        diffuse = ET.SubElement(material, "diffuse")
        r, g, b = self.color
        diffuse.text = f"{r} {g} {b} 1"
        
        return model


class MazeGenerator:
    """Generates maze world files for Gazebo"""
    
    def __init__(self, width: float = 10.0, height: float = 10.0, 
                 boundary_height: float = 0.5, boundary_thickness: float = 0.2):
        self.width = width
        self.height = height
        self.boundary_height = boundary_height
        self.boundary_thickness = boundary_thickness
        self.walls: List[MazeWall] = []
        self.markers: List[MazeMarker] = []
        self._create_boundary()
    
    def _create_boundary(self):
        """Create outer boundary walls"""
        half_w = self.width / 2
        half_h = self.height / 2
        color_boundary = (0.3, 0.3, 0.3)
        
        # North wall
        self.walls.append(MazeWall("wall_north", 0, half_h, self.width, 
                                   self.boundary_thickness, self.boundary_height, 
                                   "horizontal", color_boundary))
        
        # South wall
        self.walls.append(MazeWall("wall_south", 0, -half_h, self.width,
                                   self.boundary_thickness, self.boundary_height,
                                   "horizontal", color_boundary))
        
        # East wall
        self.walls.append(MazeWall("wall_east", half_w, 0, self.height,
                                   self.boundary_thickness, self.boundary_height,
                                   "vertical", color_boundary))
        
        # West wall
        self.walls.append(MazeWall("wall_west", -half_w, 0, self.height,
                                   self.boundary_thickness, self.boundary_height,
                                   "vertical", color_boundary))
    
    def add_wall(self, x: float, y: float, length: float, 
                 orientation: str = "horizontal"):
        """Add a wall to the maze"""
        wall_id = len(self.walls)
        self.walls.append(MazeWall(f"wall_{wall_id}", x, y, length, 
                                   orientation=orientation))
    
    def add_goal(self, x: float, y: float, name: str = "goal"):
        """Add a goal marker"""
        self.markers.append(MazeMarker(name, x, y, color=(0.2, 0.8, 0.2)))
    
    def add_start(self, x: float, y: float, name: str = "start"):
        """Add a start marker"""
        self.markers.append(MazeMarker(name, x, y, color=(0.2, 0.2, 0.8)))
    
    def generate_sdf(self) -> str:
        """Generate the complete SDF world file"""
        # Create root elements
        sdf = ET.Element("sdf", {"version": "1.6"})
        world = ET.SubElement(sdf, "world", {"name": "maze"})
        
        # Physics
        physics = ET.SubElement(world, "physics", {"type": "ode"})
        max_step = ET.SubElement(physics, "max_step_size")
        max_step.text = "0.001"
        real_time = ET.SubElement(physics, "real_time_factor")
        real_time.text = "1"
        
        # Include sun and ground plane
        sun_include = ET.SubElement(world, "include")
        sun_uri = ET.SubElement(sun_include, "uri")
        sun_uri.text = "model://sun"
        
        ground_include = ET.SubElement(world, "include")
        ground_uri = ET.SubElement(ground_include, "uri")
        ground_uri.text = "model://ground_plane"
        
        # Add walls
        for wall in self.walls:
            world.append(wall.to_xml())
        
        # Add markers
        for marker in self.markers:
            world.append(marker.to_xml())
        
        # Pretty print
        xml_str = minidom.parseString(ET.tostring(sdf)).toprettyxml(indent="  ")
        # Remove extra blank lines
        xml_str = "\n".join([line for line in xml_str.split("\n") if line.strip()])
        return xml_str
    
    def save(self, filepath: str):
        """Save the maze to an SDF file"""
        with open(filepath, 'w') as f:
            f.write(self.generate_sdf())


def create_simple_maze() -> MazeGenerator:
    """Create a simple maze configuration"""
    maze = MazeGenerator(width=10.0, height=10.0)
    
    # Add interior walls to create maze paths
    # Vertical walls
    maze.add_wall(-2.0, 2.0, 3.0, "vertical")
    maze.add_wall(2.0, 1.0, 3.0, "vertical")
    maze.add_wall(-3.5, -1.0, 2.5, "vertical")
    
    # Horizontal walls
    maze.add_wall(-1.0, -1.5, 2.5, "horizontal")
    maze.add_wall(3.0, -2.5, 2.0, "horizontal")
    maze.add_wall(-4.5, 0.5, 2.0, "horizontal")
    
    # Add markers
    maze.add_start(-4.0, -3.5, "start_marker")
    maze.add_goal(4.0, 3.5, "goal_marker")
    
    return maze


def create_complex_maze() -> MazeGenerator:
    """Create a more complex maze configuration"""
    maze = MazeGenerator(width=12.0, height=12.0)
    
    # Create a grid-like maze
    # Vertical walls
    for x in [-3, 0, 3]:
        for y_start, y_end in [(-5, -2), (-1, 2), (3, 6)]:
            length = y_end - y_start
            maze.add_wall(x, (y_start + y_end) / 2, length, "vertical")
    
    # Horizontal walls
    for y in [-3.5, 0, 3.5]:
        for x_start, x_end in [(-5.5, -2), (-1, 2), (3, 5.5)]:
            length = x_end - x_start
            maze.add_wall((x_start + x_end) / 2, y, length, "horizontal")
    
    # Add markers
    maze.add_start(-5.0, -5.0, "start_marker")
    maze.add_goal(5.0, 5.0, "goal_marker")
    
    return maze


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate custom maze for Gazebo")
    parser.add_argument("--type", choices=["simple", "complex"], default="simple",
                        help="Type of maze to generate")
    parser.add_argument("--output", type=str, default="maze.world",
                        help="Output file path")
    
    args = parser.parse_args()
    
    if args.type == "simple":
        maze = create_simple_maze()
    else:
        maze = create_complex_maze()
    
    maze.save(args.output)
    print(f"Maze generated: {args.output}")
