#!/usr/bin/env python3
"""
TurtleBot3 Maze GUI - Interactive Maze Designer
GUI-based tool for creating and customizing maze environments
"""

import sys
import os
from typing import Optional, Tuple
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from maze_generator import MazeGenerator, MazeWall, MazeMarker


class MazeCanvas:
    """Canvas for visualizing and editing maze"""
    
    def __init__(self, canvas_widget, maze_generator):
        self.canvas = canvas_widget
        self.maze = maze_generator
        self.scale = 30  # pixels per meter
        self.offset_x = 150
        self.offset_y = 150
        self.selected_wall = None
        self.drag_start = None
        
        # Bind mouse events
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        self.canvas.bind("<B1-Motion>", self.on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_canvas_release)
        
        self.draw_maze()
    
    def world_to_canvas(self, x: float, y: float) -> Tuple[int, int]:
        """Convert world coordinates to canvas coordinates"""
        canvas_x = int(x * self.scale + self.offset_x)
        canvas_y = int(-y * self.scale + self.offset_y)
        return canvas_x, canvas_y
    
    def canvas_to_world(self, canvas_x: int, canvas_y: int) -> Tuple[float, float]:
        """Convert canvas coordinates to world coordinates"""
        x = (canvas_x - self.offset_x) / self.scale
        y = -(canvas_y - self.offset_y) / self.scale
        return x, y
    
    def draw_maze(self):
        """Draw the entire maze on canvas"""
        self.canvas.delete("all")
        
        # Draw grid
        self._draw_grid()
        
        # Draw walls
        for i, wall in enumerate(self.maze.walls):
            self._draw_wall(wall, i < 4)  # Boundary walls in different color
        
        # Draw markers
        for marker in self.maze.markers:
            self._draw_marker(marker)
        
        # Draw coordinate system
        self._draw_axes()
    
    def _draw_grid(self):
        """Draw background grid"""
        grid_spacing = 5 * self.scale  # 5m grid
        
        # Vertical lines
        for x in range(int(-self.maze.width / 2), int(self.maze.width / 2) + 1, 5):
            x1, y1 = self.world_to_canvas(x, -self.maze.height / 2)
            x2, y2 = self.world_to_canvas(x, self.maze.height / 2)
            self.canvas.create_line(x1, y1, x2, y2, fill="lightgray", dash=(2, 4))
        
        # Horizontal lines
        for y in range(int(-self.maze.height / 2), int(self.maze.height / 2) + 1, 5):
            x1, y1 = self.world_to_canvas(-self.maze.width / 2, y)
            x2, y2 = self.world_to_canvas(self.maze.width / 2, y)
            self.canvas.create_line(x1, y1, x2, y2, fill="lightgray", dash=(2, 4))
    
    def _draw_wall(self, wall: MazeWall, is_boundary: bool = False):
        """Draw a wall on canvas"""
        r, g, b = wall.color
        color = f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
        
        if wall.orientation == "horizontal":
            x1 = wall.x - wall.length / 2
            x2 = wall.x + wall.length / 2
            y = wall.y
            
            cx1, cy1 = self.world_to_canvas(x1, y)
            cx2, cy2 = self.world_to_canvas(x2, y)
            self.canvas.create_line(cx1, cy1, cx2, cy2, fill=color, width=3)
        else:
            x = wall.x
            y1 = wall.y - wall.length / 2
            y2 = wall.y + wall.length / 2
            
            cx1, cy1 = self.world_to_canvas(x, y1)
            cx2, cy2 = self.world_to_canvas(x, y2)
            self.canvas.create_line(cx1, cy1, cx2, cy2, fill=color, width=3)
    
    def _draw_marker(self, marker: MazeMarker):
        """Draw a marker (goal/start) on canvas"""
        r, g, b = marker.color
        color = f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"
        
        cx, cy = self.world_to_canvas(marker.x, marker.y)
        radius = int(marker.radius * self.scale)
        
        self.canvas.create_oval(
            cx - radius, cy - radius,
            cx + radius, cy + radius,
            fill=color, outline="black", width=2
        )
        
        # Draw label
        label = "S" if "start" in marker.name.lower() else "G"
        self.canvas.create_text(cx, cy, text=label, font=("Arial", 12, "bold"), fill="white")
    
    def _draw_axes(self):
        """Draw coordinate axes"""
        ox, oy = self.world_to_canvas(0, 0)
        
        # X-axis (red)
        x_end, y_end = self.world_to_canvas(2, 0)
        self.canvas.create_line(ox, oy, x_end, y_end, fill="red", width=2)
        self.canvas.create_text(x_end + 10, y_end, text="X", fill="red", font=("Arial", 10, "bold"))
        
        # Y-axis (green)
        x_end, y_end = self.world_to_canvas(0, 2)
        self.canvas.create_line(ox, oy, x_end, y_end, fill="green", width=2)
        self.canvas.create_text(x_end, y_end - 10, text="Y", fill="green", font=("Arial", 10, "bold"))
        
        # Origin
        self.canvas.create_oval(ox - 3, oy - 3, ox + 3, oy + 3, fill="black")
    
    def on_canvas_click(self, event):
        """Handle canvas click"""
        x, y = self.canvas_to_world(event.x, event.y)
        self.drag_start = (x, y)
    
    def on_canvas_drag(self, event):
        """Handle canvas drag"""
        pass
    
    def on_canvas_release(self, event):
        """Handle canvas release"""
        self.drag_start = None


class MazeGUI:
    """Main GUI application for maze customization"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("TurtleBot3 Maze Designer")
        self.root.geometry("1200x800")
        
        self.maze = MazeGenerator(width=10.0, height=10.0)
        self.current_file = None
        
        self._create_ui()
    
    def _create_ui(self):
        """Create the user interface"""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Left panel - Controls
        left_frame = ttk.Frame(main_frame, width=250)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, padx=5)
        left_frame.pack_propagate(False)
        
        # Right panel - Canvas
        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5)
        
        # Create controls
        self._create_controls(left_frame)
        
        # Create canvas
        self.canvas = tk.Canvas(right_frame, bg="white", highlightthickness=1, highlightbackground="gray")
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Create maze visualization
        self.maze_canvas = MazeCanvas(self.canvas, self.maze)
    
    def _create_controls(self, parent):
        """Create control panel"""
        # Title
        title = ttk.Label(parent, text="Maze Designer", font=("Arial", 16, "bold"))
        title.pack(pady=10)
        
        # Maze size section
        size_frame = ttk.LabelFrame(parent, text="Maze Size", padding=10)
        size_frame.pack(fill=tk.X, pady=10)
        
        ttk.Label(size_frame, text="Width (m):").pack()
        self.width_var = tk.DoubleVar(value=10.0)
        ttk.Spinbox(size_frame, from_=5, to=30, textvariable=self.width_var, width=10).pack()
        
        ttk.Label(size_frame, text="Height (m):").pack(pady=(10, 0))
        self.height_var = tk.DoubleVar(value=10.0)
        ttk.Spinbox(size_frame, from_=5, to=30, textvariable=self.height_var, width=10).pack()
        
        ttk.Button(size_frame, text="Create Maze", command=self.create_new_maze).pack(pady=10, fill=tk.X)
        
        # Wall section
        wall_frame = ttk.LabelFrame(parent, text="Add Wall", padding=10)
        wall_frame.pack(fill=tk.X, pady=10)
        
        ttk.Label(wall_frame, text="X (m):").pack()
        self.wall_x = tk.DoubleVar(value=0.0)
        ttk.Spinbox(wall_frame, from_=-15, to=15, textvariable=self.wall_x, width=10).pack()
        
        ttk.Label(wall_frame, text="Y (m):").pack(pady=(10, 0))
        self.wall_y = tk.DoubleVar(value=0.0)
        ttk.Spinbox(wall_frame, from_=-15, to=15, textvariable=self.wall_y, width=10).pack()
        
        ttk.Label(wall_frame, text="Length (m):").pack(pady=(10, 0))
        self.wall_length = tk.DoubleVar(value=2.0)
        ttk.Spinbox(wall_frame, from_=0.5, to=20, textvariable=self.wall_length, width=10).pack()
        
        ttk.Label(wall_frame, text="Orientation:").pack(pady=(10, 0))
        self.orientation_var = tk.StringVar(value="horizontal")
        ttk.Combobox(wall_frame, textvariable=self.orientation_var, 
                    values=["horizontal", "vertical"], state="readonly", width=10).pack()
        
        ttk.Button(wall_frame, text="Add Wall", command=self.add_wall).pack(pady=10, fill=tk.X)
        
        # Markers section
        marker_frame = ttk.LabelFrame(parent, text="Add Markers", padding=10)
        marker_frame.pack(fill=tk.X, pady=10)
        
        ttk.Label(marker_frame, text="Start X (m):").pack()
        self.start_x = tk.DoubleVar(value=-4.0)
        ttk.Spinbox(marker_frame, from_=-15, to=15, textvariable=self.start_x, width=10).pack()
        
        ttk.Label(marker_frame, text="Start Y (m):").pack(pady=(10, 0))
        self.start_y = tk.DoubleVar(value=-4.0)
        ttk.Spinbox(marker_frame, from_=-15, to=15, textvariable=self.start_y, width=10).pack()
        
        ttk.Button(marker_frame, text="Add Start", command=self.add_start).pack(pady=5, fill=tk.X)
        
        ttk.Label(marker_frame, text="Goal X (m):").pack(pady=(10, 0))
        self.goal_x = tk.DoubleVar(value=4.0)
        ttk.Spinbox(marker_frame, from_=-15, to=15, textvariable=self.goal_x, width=10).pack()
        
        ttk.Label(marker_frame, text="Goal Y (m):").pack(pady=(10, 0))
        self.goal_y = tk.DoubleVar(value=4.0)
        ttk.Spinbox(marker_frame, from_=-15, to=15, textvariable=self.goal_y, width=10).pack()
        
        ttk.Button(marker_frame, text="Add Goal", command=self.add_goal).pack(pady=5, fill=tk.X)
        
        # File section
        file_frame = ttk.LabelFrame(parent, text="File Operations", padding=10)
        file_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(file_frame, text="Save Maze", command=self.save_maze).pack(pady=5, fill=tk.X)
        ttk.Button(file_frame, text="Load Maze", command=self.load_maze).pack(pady=5, fill=tk.X)
        ttk.Button(file_frame, text="Load Preset", command=self.load_preset).pack(pady=5, fill=tk.X)
        
        # Info section
        info_frame = ttk.LabelFrame(parent, text="Maze Info", padding=10)
        info_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        self.info_text = tk.Text(info_frame, height=10, width=25, state=tk.DISABLED)
        self.info_text.pack(fill=tk.BOTH, expand=True)
        
        self.update_info()
    
    def create_new_maze(self):
        """Create a new maze"""
        try:
            width = self.width_var.get()
            height = self.height_var.get()
            
            self.maze = MazeGenerator(width=width, height=height)
            self.maze_canvas.maze = self.maze
            self.maze_canvas.draw_maze()
            self.update_info()
            messagebox.showinfo("Success", f"Maze created: {width}m x {height}m")
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid input: {e}")
    
    def add_wall(self):
        """Add a wall to the maze"""
        try:
            x = self.wall_x.get()
            y = self.wall_y.get()
            length = self.wall_length.get()
            orientation = self.orientation_var.get()
            
            self.maze.add_wall(x, y, length, orientation)
            self.maze_canvas.draw_maze()
            self.update_info()
            messagebox.showinfo("Success", f"Wall added at ({x}, {y})")
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid input: {e}")
    
    def add_start(self):
        """Add start marker"""
        try:
            x = self.start_x.get()
            y = self.start_y.get()
            
            self.maze.add_start(x, y)
            self.maze_canvas.draw_maze()
            self.update_info()
            messagebox.showinfo("Success", f"Start marker added at ({x}, {y})")
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid input: {e}")
    
    def add_goal(self):
        """Add goal marker"""
        try:
            x = self.goal_x.get()
            y = self.goal_y.get()
            
            self.maze.add_goal(x, y)
            self.maze_canvas.draw_maze()
            self.update_info()
            messagebox.showinfo("Success", f"Goal marker added at ({x}, {y})")
        except ValueError as e:
            messagebox.showerror("Error", f"Invalid input: {e}")
    
    def save_maze(self):
        """Save maze to file"""
        file_path = filedialog.asksaveasfilename(
            defaultextension=".world",
            filetypes=[("Gazebo World", "*.world"), ("All Files", "*.*")],
            initialdir=os.path.join(os.path.dirname(__file__), "worlds")
        )
        
        if file_path:
            try:
                self.maze.save(file_path)
                self.current_file = file_path
                messagebox.showinfo("Success", f"Maze saved to:\n{file_path}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save: {e}")
    
    def load_maze(self):
        """Load maze from file"""
        messagebox.showinfo("Info", "Load functionality coming soon")
    
    def load_preset(self):
        """Load a preset maze"""
        from generate_maze_examples import (
            example_simple_maze, example_corridor_maze, example_grid_maze,
            example_spiral_maze, example_challenge_maze
        )
        
        presets = {
            "Simple": example_simple_maze,
            "Corridor": example_corridor_maze,
            "Grid": example_grid_maze,
            "Spiral": example_spiral_maze,
            "Challenge": example_challenge_maze,
        }
        
        preset_window = tk.Toplevel(self.root)
        preset_window.title("Load Preset")
        preset_window.geometry("300x250")
        
        ttk.Label(preset_window, text="Select a preset:", font=("Arial", 12)).pack(pady=10)
        
        for name, func in presets.items():
            ttk.Button(preset_window, text=name, 
                      command=lambda f=func: self._load_preset_maze(f, preset_window)).pack(pady=5, fill=tk.X, padx=20)
    
    def _load_preset_maze(self, func, window):
        """Load selected preset maze"""
        try:
            func()
            window.destroy()
            messagebox.showinfo("Success", "Preset maze loaded")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load preset: {e}")
    
    def update_info(self):
        """Update maze information display"""
        info = f"Maze Dimensions:\n"
        info += f"  Width: {self.maze.width}m\n"
        info += f"  Height: {self.maze.height}m\n\n"
        info += f"Walls: {len(self.maze.walls)}\n"
        info += f"  Boundary: 4\n"
        info += f"  Interior: {len(self.maze.walls) - 4}\n\n"
        info += f"Markers: {len(self.maze.markers)}\n"
        
        for marker in self.maze.markers:
            marker_type = "Start" if "start" in marker.name.lower() else "Goal"
            info += f"  {marker_type}: ({marker.x:.1f}, {marker.y:.1f})\n"
        
        self.info_text.config(state=tk.NORMAL)
        self.info_text.delete("1.0", tk.END)
        self.info_text.insert("1.0", info)
        self.info_text.config(state=tk.DISABLED)


def main():
    """Main entry point"""
    root = tk.Tk()
    app = MazeGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
