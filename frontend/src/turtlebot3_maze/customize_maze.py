#!/usr/bin/env python3
"""
Interactive Maze Customization Tool
Helps create custom mazes with an interactive interface
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from maze_generator import MazeGenerator, MazeWall, MazeMarker


class MazeBuilder:
    """Interactive maze builder"""
    
    def __init__(self):
        self.maze = None
        self.width = 10.0
        self.height = 10.0
    
    def create_maze(self):
        """Create a new maze"""
        print("\n" + "=" * 60)
        print("Create New Maze")
        print("=" * 60)
        
        try:
            width = float(input(f"Enter maze width [default: {self.width}]: ") or self.width)
            height = float(input(f"Enter maze height [default: {self.height}]: ") or self.height)
            
            self.width = width
            self.height = height
            self.maze = MazeGenerator(width=width, height=height)
            
            print(f"\n✓ Maze created: {width}m x {height}m")
            return True
        except ValueError as e:
            print(f"✗ Invalid input: {e}")
            return False
    
    def add_wall_interactive(self):
        """Add a wall interactively"""
        if self.maze is None:
            print("✗ Create a maze first!")
            return
        
        print("\n" + "-" * 60)
        print("Add Wall")
        print("-" * 60)
        
        try:
            x = float(input("Enter X coordinate: "))
            y = float(input("Enter Y coordinate: "))
            length = float(input("Enter wall length: "))
            
            orientation = input("Enter orientation (h/v) [default: h]: ").lower() or "h"
            orientation = "horizontal" if orientation == "h" else "vertical"
            
            self.maze.add_wall(x, y, length, orientation)
            print(f"✓ Wall added at ({x}, {y}), length={length}m, orientation={orientation}")
        except ValueError as e:
            print(f"✗ Invalid input: {e}")
    
    def add_markers_interactive(self):
        """Add start and goal markers"""
        if self.maze is None:
            print("✗ Create a maze first!")
            return
        
        print("\n" + "-" * 60)
        print("Add Markers")
        print("-" * 60)
        
        try:
            # Start marker
            print("\nStart Marker (blue):")
            start_x = float(input("  Enter X coordinate: "))
            start_y = float(input("  Enter Y coordinate: "))
            self.maze.add_start(start_x, start_y, "start_marker")
            print(f"  ✓ Start marker added at ({start_x}, {start_y})")
            
            # Goal marker
            print("\nGoal Marker (green):")
            goal_x = float(input("  Enter X coordinate: "))
            goal_y = float(input("  Enter Y coordinate: "))
            self.maze.add_goal(goal_x, goal_y, "goal_marker")
            print(f"  ✓ Goal marker added at ({goal_x}, {goal_y})")
        except ValueError as e:
            print(f"✗ Invalid input: {e}")
    
    def preview_maze(self):
        """Show maze summary"""
        if self.maze is None:
            print("✗ Create a maze first!")
            return
        
        print("\n" + "-" * 60)
        print("Maze Summary")
        print("-" * 60)
        print(f"Dimensions: {self.width}m x {self.height}m")
        print(f"Total walls: {len(self.maze.walls)}")
        print(f"  - Boundary walls: 4")
        print(f"  - Interior walls: {len(self.maze.walls) - 4}")
        print(f"Markers: {len(self.maze.markers)}")
        
        if self.maze.walls:
            print("\nWalls:")
            for i, wall in enumerate(self.maze.walls[4:], 1):
                print(f"  {i}. {wall.name}: ({wall.x}, {wall.y}), "
                      f"length={wall.length}m, {wall.orientation}")
        
        if self.maze.markers:
            print("\nMarkers:")
            for marker in self.maze.markers:
                print(f"  - {marker.name}: ({marker.x}, {marker.y})")
    
    def save_maze(self):
        """Save maze to file"""
        if self.maze is None:
            print("✗ Create a maze first!")
            return
        
        print("\n" + "-" * 60)
        default_path = os.path.join(os.path.dirname(__file__), "worlds/maze_custom.world")
        filepath = input(f"Enter save path [default: {default_path}]: ") or default_path
        
        try:
            self.maze.save(filepath)
            print(f"✓ Maze saved to {filepath}")
        except Exception as e:
            print(f"✗ Error saving maze: {e}")
    
    def load_preset(self):
        """Load a preset maze configuration"""
        from generate_maze_examples import (
            example_simple_maze, example_corridor_maze, example_grid_maze,
            example_spiral_maze, example_challenge_maze
        )
        
        print("\n" + "-" * 60)
        print("Load Preset Maze")
        print("-" * 60)
        print("1. Simple Maze")
        print("2. Corridor Maze")
        print("3. Grid Maze")
        print("4. Spiral Maze")
        print("5. Challenge Maze")
        
        try:
            choice = input("\nSelect maze type (1-5): ").strip()
            
            presets = {
                "1": ("simple", example_simple_maze),
                "2": ("corridor", example_corridor_maze),
                "3": ("grid", example_grid_maze),
                "4": ("spiral", example_spiral_maze),
                "5": ("challenge", example_challenge_maze),
            }
            
            if choice in presets:
                name, func = presets[choice]
                func()
                print(f"✓ {name.capitalize()} maze generated!")
            else:
                print("✗ Invalid choice")
        except Exception as e:
            print(f"✗ Error loading preset: {e}")
    
    def show_menu(self):
        """Display main menu"""
        print("\n" + "=" * 60)
        print("Maze Customization Tool")
        print("=" * 60)
        print("1. Create new maze")
        print("2. Add wall")
        print("3. Add markers (start/goal)")
        print("4. Preview maze")
        print("5. Save maze")
        print("6. Load preset maze")
        print("7. Exit")
        print("=" * 60)
    
    def run(self):
        """Run interactive builder"""
        print("\n" + "🎯" * 20)
        print("  TurtleBot3 Maze Customization Tool")
        print("🎯" * 20)
        
        while True:
            self.show_menu()
            
            choice = input("\nSelect an option (1-7): ").strip()
            
            if choice == "1":
                self.create_maze()
            elif choice == "2":
                self.add_wall_interactive()
            elif choice == "3":
                self.add_markers_interactive()
            elif choice == "4":
                self.preview_maze()
            elif choice == "5":
                self.save_maze()
            elif choice == "6":
                self.load_preset()
            elif choice == "7":
                print("\n✓ Goodbye!")
                break
            else:
                print("✗ Invalid option. Please try again.")


def main():
    """Entry point"""
    builder = MazeBuilder()
    
    # Check if running with arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--preset":
            # Quick preset loading
            preset = sys.argv[2] if len(sys.argv) > 2 else "simple"
            
            from generate_maze_examples import (
                example_simple_maze, example_corridor_maze, example_grid_maze,
                example_spiral_maze, example_challenge_maze
            )
            
            presets = {
                "simple": example_simple_maze,
                "corridor": example_corridor_maze,
                "grid": example_grid_maze,
                "spiral": example_spiral_maze,
                "challenge": example_challenge_maze,
            }
            
            if preset in presets:
                presets[preset]()
                print(f"✓ {preset.capitalize()} maze generated!")
            else:
                print(f"✗ Unknown preset: {preset}")
                print(f"  Available: {', '.join(presets.keys())}")
            return
    
    # Interactive mode
    builder.run()


if __name__ == "__main__":
    main()
