#!/usr/bin/env python3
"""
Example script demonstrating how to create custom mazes
"""

import sys
import os

# Add the package directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from maze_generator import MazeGenerator


def example_simple_maze():
    """Example 1: Create a simple 10x10 maze"""
    print("Creating simple maze...")
    maze = MazeGenerator(width=10.0, height=10.0)
    
    # Add some interior walls
    maze.add_wall(-2.0, 2.0, 3.0, "vertical")
    maze.add_wall(2.0, 1.0, 3.0, "vertical")
    maze.add_wall(-1.0, -1.5, 2.5, "horizontal")
    
    # Add start and goal
    maze.add_start(-4.0, -3.5)
    maze.add_goal(4.0, 3.5)
    
    # Save
    output_path = os.path.join(os.path.dirname(__file__), "worlds/maze_simple.world")
    maze.save(output_path)
    print(f"✓ Saved to {output_path}")


def example_corridor_maze():
    """Example 2: Create a corridor-style maze"""
    print("\nCreating corridor maze...")
    maze = MazeGenerator(width=12.0, height=8.0)
    
    # Create parallel corridors
    maze.add_wall(-4.0, 1.5, 4.0, "horizontal")
    maze.add_wall(0.0, -1.5, 4.0, "horizontal")
    
    # Add some connecting walls
    maze.add_wall(-2.0, 0.0, 1.5, "vertical")
    maze.add_wall(2.0, 0.0, 1.5, "vertical")
    
    # Start at left, goal at right
    maze.add_start(-5.5, 0.0)
    maze.add_goal(5.5, 0.0)
    
    output_path = os.path.join(os.path.dirname(__file__), "worlds/maze_corridor.world")
    maze.save(output_path)
    print(f"✓ Saved to {output_path}")


def example_grid_maze():
    """Example 3: Create a grid-based maze"""
    print("\nCreating grid maze...")
    maze = MazeGenerator(width=12.0, height=12.0)
    
    # Create a 3x3 grid structure
    cell_size = 4.0
    
    # Vertical divisions
    for x in [-2.0, 2.0]:
        maze.add_wall(x, 0.0, 10.0, "vertical")
    
    # Horizontal divisions
    for y in [-2.0, 2.0]:
        maze.add_wall(0.0, y, 10.0, "horizontal")
    
    # Add partial walls to create paths
    maze.add_wall(-4.0, -2.0, 1.5, "horizontal")
    maze.add_wall(0.0, 2.0, 1.5, "horizontal")
    maze.add_wall(4.0, 0.0, 1.5, "vertical")
    
    # Start and goal at opposite corners
    maze.add_start(-5.0, -5.0)
    maze.add_goal(5.0, 5.0)
    
    output_path = os.path.join(os.path.dirname(__file__), "worlds/maze_grid.world")
    maze.save(output_path)
    print(f"✓ Saved to {output_path}")


def example_spiral_maze():
    """Example 4: Create a spiral maze"""
    print("\nCreating spiral maze...")
    maze = MazeGenerator(width=14.0, height=14.0)
    
    # Create concentric square walls (simplified spiral)
    spiral_walls = [
        # Outer square
        (0.0, 5.5, 11.0, "horizontal"),
        (5.5, 0.0, 11.0, "vertical"),
        (0.0, -5.5, 11.0, "horizontal"),
        (-5.5, 0.0, 11.0, "vertical"),
        
        # Middle square
        (0.0, 3.0, 6.0, "horizontal"),
        (3.0, 0.0, 6.0, "vertical"),
        (0.0, -3.0, 6.0, "horizontal"),
        (-3.0, 0.0, 6.0, "vertical"),
    ]
    
    for x, y, length, orientation in spiral_walls:
        maze.add_wall(x, y, length, orientation)
    
    # Add entrances/exits
    maze.add_wall(-4.0, 5.5, 1.5, "horizontal")
    maze.add_wall(4.0, -5.5, 1.5, "horizontal")
    
    maze.add_start(-6.0, 6.0)
    maze.add_goal(0.0, 0.0)
    
    output_path = os.path.join(os.path.dirname(__file__), "worlds/maze_spiral.world")
    maze.save(output_path)
    print(f"✓ Saved to {output_path}")


def example_challenge_maze():
    """Example 5: Create a challenging maze with narrow passages"""
    print("\nCreating challenge maze...")
    maze = MazeGenerator(width=15.0, height=15.0)
    
    # Create a challenging layout with narrow passages (0.4m minimum)
    walls = [
        # Main horizontal divisions
        (-4.0, 4.0, 7.0, "horizontal"),
        (-2.0, 0.0, 5.0, "horizontal"),
        (2.0, -4.0, 7.0, "horizontal"),
        
        # Main vertical divisions
        (4.0, 3.0, 6.0, "vertical"),
        (-3.0, -2.0, 5.0, "vertical"),
        (0.0, -4.5, 3.0, "vertical"),
        
        # Cross-connections
        (-5.0, 2.0, 2.0, "vertical"),
        (3.0, 0.0, 2.0, "vertical"),
        (-1.0, -3.0, 2.0, "vertical"),
    ]
    
    for x, y, length, orientation in walls:
        maze.add_wall(x, y, length, orientation)
    
    maze.add_start(-6.5, 6.5)
    maze.add_goal(6.5, -6.5)
    
    output_path = os.path.join(os.path.dirname(__file__), "worlds/maze_challenge.world")
    maze.save(output_path)
    print(f"✓ Saved to {output_path}")


def main():
    """Run all examples"""
    print("=" * 60)
    print("TurtleBot3 Maze Generator - Examples")
    print("=" * 60)
    
    try:
        example_simple_maze()
        example_corridor_maze()
        example_grid_maze()
        example_spiral_maze()
        example_challenge_maze()
        
        print("\n" + "=" * 60)
        print("✓ All mazes generated successfully!")
        print("=" * 60)
        print("\nGenerated maze files:")
        worlds_dir = os.path.join(os.path.dirname(__file__), "worlds")
        if os.path.exists(worlds_dir):
            for f in sorted(os.listdir(worlds_dir)):
                if f.endswith(".world"):
                    print(f"  - {f}")
        
        print("\nTo use a specific maze, update your launch file or modify")
        print("the ExecuteProcess command in slam.launch.py or navigation.launch.py")
        
    except Exception as e:
        print(f"\n✗ Error generating mazes: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
