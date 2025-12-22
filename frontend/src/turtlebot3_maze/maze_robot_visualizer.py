#!/usr/bin/env python3
"""
TurtleBot3 Maze Robot Visualizer - Real-time Robot Tracking GUI (Pygame Edition)
Visualizes TurtleBot3 position and actions in the maze environment
"""

import sys
import os
import math
import time
import threading
import subprocess
import heapq
from typing import Callable, Dict, Iterable, List, Optional, Tuple
import pygame
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from maze_generator import MazeGenerator, MazeWall, MazeMarker
from world_loader import load_maze_from_world

# Try to import ROS2 components
try:
    import rclpy
    from rclpy.node import Node
    from geometry_msgs.msg import Pose, Twist, PointStamped
    from nav_msgs.msg import Odometry
    from sensor_msgs.msg import LaserScan
    ROS2_AVAILABLE = True
except ImportError:
    ROS2_AVAILABLE = False

# --- Constants ---
# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
LIGHT_GRAY = (230, 230, 230)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
DARK_BLUE = (0, 0, 139)
CYAN = (0, 255, 255)
YELLOW = (255, 255, 0)
ORANGE = (255, 165, 0)
SLATE = (105, 105, 105)

# Screen dimensions
SCREEN_WIDTH = 1400
SCREEN_HEIGHT = 900
CONTROL_PANEL_WIDTH = 300
MAZE_VIEW_WIDTH = SCREEN_WIDTH - CONTROL_PANEL_WIDTH
WORLDS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'worlds')
WORLD_PRESETS = {
    'simple': {'file': 'maze_simple.world'},
    'corridor': {'file': 'maze_corridor.world', 'start': (-1.3, 0.0), 'goal': (1.3, 0.0)},
    'grid': {'file': 'maze_grid.world'},
    'spiral': {'file': 'maze_spiral.world'},
    'challenge': {'file': 'maze_challenge.world'},
    'default': {'file': 'maze.world'},
}


class RobotOdometryListener(Node if ROS2_AVAILABLE else object):
    """ROS2 node to listen to robot odometry data"""
    
    def __init__(self, callback=None):
        if ROS2_AVAILABLE:
            super().__init__('robot_visualizer_pygame')
            self.subscription = self.create_subscription(
                Odometry, '/odom', self.odom_callback, 10)
            self.laser_subscription = self.create_subscription(
                LaserScan, '/scan', self.laser_callback, 10)
        
        self.robot_pos = (0.0, 0.0)
        self.robot_angle = 0.0
        self.laser_ranges = []
        self.callback = callback
    
    def odom_callback(self, msg):
        """Callback for odometry messages"""
        pose = msg.pose.pose
        self.robot_pos = (pose.position.x, pose.position.y)
        
        # Extract angle from quaternion
        q = pose.orientation
        self.robot_angle = math.atan2(2.0 * (q.w * q.z + q.x * q.y),
                                      1.0 - 2.0 * (q.y * q.y + q.z * q.z))
        
        if self.callback:
            self.callback(self.robot_pos, self.robot_angle, self.laser_ranges)
    
    def laser_callback(self, msg):
        """Callback for laser scan messages"""
        self.laser_ranges = list(msg.ranges)


# --- UI Components ---
class ControlButton:
    """Clickable button with global hit testing."""

    def __init__(
        self,
        text: str,
        callback: Optional[Callable[[], None]],
        font: pygame.font.Font,
        *,
        height: int = 36,
        bg_color: Tuple[int, int, int] = GRAY,
        text_color: Tuple[int, int, int] = BLACK,
        hover_color: Tuple[int, int, int] = DARK_BLUE,
        disabled_color: Tuple[int, int, int] = SLATE,
    ) -> None:
        self.text = text
        self.callback = callback
        self.font = font
        self.bg_color = bg_color
        self.text_color = text_color
        self.hover_color = hover_color
        self.disabled_color = disabled_color
        self.rect = pygame.Rect(0, 0, 40, height)
        self.screen_rect = pygame.Rect(self.rect)
        self.enabled = True
        self.is_hovered = False
        self.preferred_height = height

    def set_text(self, text: str) -> None:
        self.text = text

    def set_enabled(self, enabled: bool) -> None:
        self.enabled = enabled
        if not enabled:
            self.is_hovered = False

    def place(self, x: int, y: int, width: int, height: Optional[int], origin: Tuple[int, int]) -> None:
        height = height if height is not None else self.preferred_height
        self.rect.update(x, y, width, height)
        self.screen_rect = pygame.Rect(x + origin[0], y + origin[1], width, height)

    def handle_event(self, event: pygame.event.Event) -> bool:
        if hasattr(event, 'pos'):
            pos = event.pos
            if event.type == pygame.MOUSEMOTION:
                self.is_hovered = self.enabled and self.screen_rect.collidepoint(pos)
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                if self.enabled and self.screen_rect.collidepoint(pos):
                    if self.callback:
                        self.callback()
                    return True
        return False

    def draw(self, surface: pygame.Surface) -> None:
        if not self.enabled:
            color = self.disabled_color
        elif self.is_hovered:
            color = self.hover_color
        else:
            color = self.bg_color

        pygame.draw.rect(surface, color, self.rect, border_radius=4)
        pygame.draw.rect(surface, BLACK, self.rect, 1, border_radius=4)

        text_surface = self.font.render(self.text, True, self.text_color)
        text_rect = text_surface.get_rect(center=self.rect.center)
        surface.blit(text_surface, text_rect)


class ToggleButton(ControlButton):
    """Toggle button that maintains ON/OFF state."""

    def __init__(
        self,
        label: str,
        initial_state: bool,
        callback: Optional[Callable[[bool], None]],
        font: pygame.font.Font,
        *,
        height: int = 36,
        on_label: str = "ON",
        off_label: str = "OFF",
        bg_color: Tuple[int, int, int] = GRAY,
        text_color: Tuple[int, int, int] = BLACK,
        hover_color: Tuple[int, int, int] = DARK_BLUE,
        disabled_color: Tuple[int, int, int] = SLATE,
    ) -> None:
        self.label = label
        self.state = initial_state
        self.on_label = on_label
        self.off_label = off_label
        self._user_callback = callback
        super().__init__(
            self._compose_label(),
            self._internal_toggle,
            font,
            height=height,
            bg_color=bg_color,
            text_color=text_color,
            hover_color=hover_color,
            disabled_color=disabled_color,
        )

    def _compose_label(self) -> str:
        return f"{self.label}: {self.on_label if self.state else self.off_label}"

    def _internal_toggle(self) -> None:
        self.state = not self.state
        self.set_text(self._compose_label())
        if self._user_callback:
            self._user_callback(self.state)

    def set_state(self, state: bool) -> None:
        if self.state != state:
            self.state = state
            self.set_text(self._compose_label())


class ControlSection:
    """Logical section grouping control widgets."""

    def __init__(self, panel: 'ControlPanel', title: str, layout: str = "column", columns: int = 1) -> None:
        self.panel = panel
        self.title = title
        self.layout = layout
        self.columns = max(1, columns)
        self.widgets: List[ControlButton] = []

    def add_button(self, text: str, callback: Optional[Callable[[], None]], *, height: int = 36) -> ControlButton:
        button = ControlButton(text, callback, self.panel.fonts['button'], height=height)
        self.widgets.append(button)
        return button

    def add_toggle(self, label: str, initial_state: bool, callback: Optional[Callable[[bool], None]], *, height: int = 36) -> ToggleButton:
        toggle = ToggleButton(label, initial_state, callback, self.panel.fonts['button'], height=height)
        self.widgets.append(toggle)
        return toggle


class ControlPanel:
    """Right-hand control panel with sections and status cards."""

    def __init__(self, width: int, height: int, origin: Tuple[int, int], fonts: Dict[str, pygame.font.Font]) -> None:
        self.width = width
        self.height = height
        self.origin = origin
        self.fonts = fonts
        self.surface = pygame.Surface((width, height))
        self.sections: List[ControlSection] = []
        self.padding = 18
        self.section_spacing = 20
        self.row_spacing = 8
        self.column_gap = 12
        self.status_card_height = 46
        self.title = "Robot Operations Console"

    def add_section(self, title: str, *, layout: str = "column", columns: int = 1) -> ControlSection:
        section = ControlSection(self, title, layout=layout, columns=columns)
        self.sections.append(section)
        return section

    def iter_widgets(self) -> Iterable[ControlButton]:
        for section in self.sections:
            for widget in section.widgets:
                yield widget

    def handle_event(self, event: pygame.event.Event) -> bool:
        consumed = False
        if hasattr(event, 'pos'):
            x, y = event.pos
            inside = (self.origin[0] <= x <= self.origin[0] + self.width and
                      self.origin[1] <= y <= self.origin[1] + self.height)
            if not inside and event.type == pygame.MOUSEBUTTONDOWN:
                return False
        for widget in self.iter_widgets():
            consumed |= widget.handle_event(event)
        return consumed

    def render(self, context: Dict[str, Iterable[str]]) -> None:
        self.surface.fill(LIGHT_GRAY)
        y = self.padding
        title_surface = self.fonts['large'].render(self.title, True, BLACK)
        self.surface.blit(title_surface, (self.padding, y))
        y += title_surface.get_height() + 6

        status_cards = context.get('status_cards', []) if context else []
        if status_cards:
            y = self._draw_status_cards(y, status_cards)
            y += self.section_spacing // 2

        for section in self.sections:
            y = self._draw_section(section, y)
            y += self.section_spacing

        robot_info = context.get('robot_info', []) if context else []
        maze_info = context.get('maze_info', []) if context else []

        if robot_info:
            y = self._draw_info_block(y, "Robot State", robot_info)
            y += self.section_spacing // 2
        if maze_info:
            y = self._draw_info_block(y, "Maze Info", maze_info)

    def _draw_status_cards(self, y: int, cards: Iterable[Dict[str, str]]) -> int:
        cards = list(cards)
        columns = 1 if len(cards) == 1 else 2
        available_width = self.width - 2 * self.padding
        column_width = int((available_width - (columns - 1) * self.column_gap) / columns)
        row_y = y
        row_height = self.status_card_height

        for idx, card in enumerate(cards):
            col = idx % columns
            row = idx // columns
            card_x = self.padding + col * (column_width + self.column_gap)
            card_y = row_y + row * (row_height + self.row_spacing)
            rect = pygame.Rect(card_x, card_y, column_width, row_height)

            pygame.draw.rect(self.surface, WHITE, rect, border_radius=6)
            pygame.draw.rect(self.surface, card.get('color', BLACK), rect, 2, border_radius=6)

            label_surface = self.fonts['medium'].render(card.get('label', ''), True, BLACK)
            value_surface = self.fonts['medium'].render(card.get('value', ''), True, card.get('color', BLACK))

            self.surface.blit(label_surface, (rect.x + 10, rect.y + 6))
            self.surface.blit(value_surface, (rect.x + 10, rect.y + 6 + label_surface.get_height()))

        rows = (len(cards) + columns - 1) // columns
        return row_y + rows * (row_height + self.row_spacing)

    def _draw_section(self, section: ControlSection, y: int) -> int:
        section_title = self.fonts['medium'].render(section.title, True, BLACK)
        self.surface.blit(section_title, (self.padding, y))
        y += section_title.get_height() + 6

        available_width = self.width - 2 * self.padding

        if section.layout == 'grid':
            columns = section.columns
            column_width = int((available_width - (columns - 1) * self.column_gap) / columns)
            rows: List[List[ControlButton]] = [
                section.widgets[i:i + columns]
                for i in range(0, len(section.widgets), columns)
            ]

            current_y = y
            for row_widgets in rows:
                row_height = max((widget.preferred_height for widget in row_widgets), default=36)
                for col_idx, widget in enumerate(row_widgets):
                    widget_x = self.padding + col_idx * (column_width + self.column_gap)
                    widget.place(widget_x, current_y, column_width, row_height, self.origin)
                    widget.draw(self.surface)
                current_y += row_height + self.row_spacing
            y = current_y
        else:
            current_y = y
            for widget in section.widgets:
                height = widget.preferred_height
                widget.place(self.padding, current_y, available_width, height, self.origin)
                widget.draw(self.surface)
                current_y += height + self.row_spacing
            y = current_y

        return y

    def _draw_info_block(self, y: int, title: str, lines: Iterable[str]) -> int:
        lines = list(lines)
        if not lines:
            return y

        title_surface = self.fonts['medium'].render(title, True, BLACK)
        self.surface.blit(title_surface, (self.padding, y))
        y += title_surface.get_height() + 4

        for line in lines:
            text_surface = self.fonts['small'].render(line, True, BLACK)
            self.surface.blit(text_surface, (self.padding + 8, y))
            y += text_surface.get_height() + 2

        return y


class RobotVisualizerPygame:
    """Main Pygame application for robot visualization"""

    def __init__(self):
        pygame.init()
        pygame.font.init()

        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("TurtleBot3 Maze Robot Visualizer (Pygame)")
        
        self.font_small = pygame.font.SysFont("Arial", 12)
        self.font_medium = pygame.font.SysFont("Arial", 16)
        self.font_large = pygame.font.SysFont("Arial", 20, bold=True)
        self.font_button = pygame.font.SysFont("Arial", 14)
        self.fonts = {
            'small': self.font_small,
            'medium': self.font_medium,
            'large': self.font_large,
            'button': self.font_button,
        }

        self.maze_surface = pygame.Surface((MAZE_VIEW_WIDTH, SCREEN_HEIGHT))
        self.control_panel_origin = (MAZE_VIEW_WIDTH, 0)
        self.control_panel = ControlPanel(CONTROL_PANEL_WIDTH, SCREEN_HEIGHT, self.control_panel_origin, self.fonts)

        self.maze = MazeGenerator(width=10.0, height=10.0)
        self.current_world_key: Optional[str] = None
        self.loaded_world_path: Optional[str] = None
        self.ros_node = None
        self.ros_thread = None
        self.app_running = False
        self.nav_goal_pub = None
        self.ai_enabled = True
        
        # Robot state
        self.robot_pos = (0.0, 0.0)
        self.robot_angle = 0.0
        self.robot_radius = 0.15
        self.robot_trail = deque(maxlen=100)
        self.laser_points = []
        self.wall_contacts = []
        self.last_collision_time = 0.0

        # Navigation state
        self.goal_pos = None
        self.goal_indicator_radius = 0.2
        self.manual_navigation_enabled = True
        self.manual_speed = 0.35
        self.manual_rotation_speed = math.radians(150)
        self.last_update_time = time.time()
        self.ros_active = False
        self.last_ros_update = 0.0
        self.manual_pid_lidar = [self.robot_radius * 1.5] * 36
        self.autonomous_waypoints: List[Tuple[float, float]] = []
        self.current_waypoint_index = 0
        self.autonomy_current_goal: Optional[Tuple[float, float]] = None
        self.autonomy_resolution = 0.25
        self.autonomy_clearance = 0.05
        self.manual_pid_state = {
            'distance_integral': 0.0,
            'distance_prev_error': 0.0,
            'heading_integral': 0.0,
            'heading_prev_error': 0.0,
            'last_time': None,
        }
        self.manual_pid_config = {
            'goal_threshold': 0.08,
            'linear_kp': 0.65,
            'linear_ki': 0.0,
            'linear_kd': 0.12,
            'heading_kp': 2.4,
            'heading_ki': 0.0,
            'heading_kd': 0.3,
            'max_linear': 0.28,
            'max_angular': 1.1,
            'integral_limit': 0.6,
            'obstacle_threshold': 0.35,
            'slowdown_distance': 0.7,
            'avoid_bias': 0.35,
            'backup_speed': 0.08,
            'collision_memory': 0.3,
        }

        # Visualization settings
        self.scale = 150  # pixels per meter (5x magnification)
        self.offset_x = MAZE_VIEW_WIDTH // 2
        self.offset_y = SCREEN_HEIGHT // 2
        
        # Simulation control
        self.simulation_process = None
        self.simulation_running = False
        self.mock_publisher_process = None
        self.mock_publisher_running = False

        # UI Elements
        self._configure_control_panel()
        
        self.clock = pygame.time.Clock()
        self._load_simple() # Load a default maze

    def _configure_control_panel(self) -> None:
        """Construct the control panel layout."""
        sim_section = self.control_panel.add_section("Simulation", layout="grid", columns=2)
        self.button_start_sim = sim_section.add_button("Start Gazebo Sim", self._start_simulation)
        self.button_stop_sim = sim_section.add_button("Stop Simulation", self._stop_simulation)
        self.button_start_mock = sim_section.add_button("Start Mock Robot", self._start_mock_robot)
        self.button_stop_mock = sim_section.add_button("Stop Mock Robot", self._stop_mock_robot)

        maze_section = self.control_panel.add_section("Maze Presets", layout="grid", columns=2)
        self.button_maze_simple = maze_section.add_button("Simple Maze", self._load_simple)
        self.button_maze_corridor = maze_section.add_button("Corridor Maze", self._load_corridor)
        self.button_maze_grid = maze_section.add_button("Grid Maze", self._load_grid)
        self.button_maze_spiral = maze_section.add_button("Spiral Maze", self._load_spiral)
        self.button_maze_challenge = maze_section.add_button("Challenge Maze", self._load_challenge)

        autonomy_section = self.control_panel.add_section("Autonomy", layout="column")
        self.ai_toggle_button = autonomy_section.add_toggle("AI", self.ai_enabled, self._set_ai_enabled)
        self.manual_nav_toggle = autonomy_section.add_toggle("Manual Nav", self.manual_navigation_enabled, self._set_manual_navigation_enabled)

        utilities = self.control_panel.add_section("Utilities", layout="grid", columns=2)
        self.button_clear_goal = utilities.add_button("Clear Goal", self._clear_goal)
        self.button_clear_trail = utilities.add_button("Clear Trail", self._clear_trail)
        self.button_center_view = utilities.add_button("Center View", self._reset_view)
        self.button_reload_maze = utilities.add_button("Reload Maze", self._reload_current_maze)

    def _clear_goal(self) -> None:
        self.goal_pos = None

    def _clear_trail(self) -> None:
        self.robot_trail.clear()

    def _reset_view(self) -> None:
        self.offset_x = MAZE_VIEW_WIDTH // 2
        self.offset_y = SCREEN_HEIGHT // 2
        self.scale = 150

    def _reload_current_maze(self) -> None:
        if hasattr(self, '_last_maze_loader') and callable(self._last_maze_loader):
            self._last_maze_loader()
        else:
            self._load_simple()

    def _set_ai_enabled(self, enabled: bool) -> None:
        self.ai_enabled = enabled
        if enabled:
            self._ensure_autonomous_goal(force=True)
        else:
            self.autonomy_current_goal = None

    def _set_manual_navigation_enabled(self, enabled: bool) -> None:
        self.manual_navigation_enabled = enabled

    def _sync_controls(self) -> None:
        self.button_start_sim.set_enabled(not self.simulation_running)
        self.button_stop_sim.set_enabled(self.simulation_running)
        self.button_start_mock.set_enabled(not self.mock_publisher_running)
        self.button_stop_mock.set_enabled(self.mock_publisher_running)
        self.ai_toggle_button.set_state(self.ai_enabled)
        self.manual_nav_toggle.set_state(self.manual_navigation_enabled)

    def run(self):
        """Main application loop"""
        self.app_running = True
        self._start_ros_listener()

        while self.app_running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(30) # Limit frame rate

        self.on_closing()

    def handle_events(self):
        """Handle user input and events"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.app_running = False
                continue

            if self.control_panel.handle_event(event):
                continue

            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1 and event.pos[0] < MAZE_VIEW_WIDTH:
                    self._handle_maze_click(event.pos)
                elif event.button == 3 and event.pos[0] < MAZE_VIEW_WIDTH:
                    self.goal_pos = None

    def _handle_maze_click(self, pos: Tuple[int, int]):
        """Convert mouse click to a navigation goal"""
        canvas_x, canvas_y = pos
        world_x, world_y = self.canvas_to_world(canvas_x, canvas_y)

        # Keep goal within maze bounds with a small margin
        margin = 0.05
        half_w = self.maze.width / 2 - margin
        half_h = self.maze.height / 2 - margin
        clamped_x = max(-half_w, min(half_w, world_x))
        clamped_y = max(-half_h, min(half_h, world_y))

        self._assign_goal((clamped_x, clamped_y), mode="manual", announce=True)

    def _assign_goal(self, target: Tuple[float, float], *, mode: str = "manual", announce: bool = False) -> None:
        """Set the active navigation goal, optionally marking it as autonomous."""
        x, y = target
        self.goal_pos = (x, y)
        self.ros_active = False
        if len(self.robot_trail) == 0:
            self.robot_trail.append(self.robot_pos)
        self._reset_manual_pid()

        if mode == "auto":
            self.autonomy_current_goal = (x, y)
        else:
            self.autonomy_current_goal = None

        if announce:
            print(f"New goal set at ({x:.2f}, {y:.2f})")

        self._publish_nav_goal(x, y)

    def _publish_nav_goal(self, x: float, y: float) -> None:
        """Publish the goal to ROS if the nav goal publisher is available."""
        if not (ROS2_AVAILABLE and self.nav_goal_pub is not None):
            return

        ps = PointStamped()
        if self.ros_node is not None:
            try:
                ps.header.stamp = self.ros_node.get_clock().now().to_msg()
            except Exception:
                ps.header.stamp = ps.header.stamp
        ps.header.frame_id = 'map'
        ps.point.x = float(x)
        ps.point.y = float(y)
        ps.point.z = 0.0
        try:
            self.nav_goal_pub.publish(ps)
        except Exception as e:
            print(f"Failed to publish nav goal: {e}")

    @staticmethod
    def _positions_close(a: Tuple[float, float], b: Tuple[float, float], tol: float = 1e-3) -> bool:
        return math.hypot(a[0] - b[0], a[1] - b[1]) <= tol

    def _ensure_autonomous_goal(self, *, force: bool = False) -> None:
        """Ensure an autonomous waypoint is active when AI mode is enabled."""
        if not self.ai_enabled or not self.autonomous_waypoints:
            return

        if self.current_waypoint_index >= len(self.autonomous_waypoints):
            return

        if self.goal_pos is not None and self.autonomy_current_goal is None and not force:
            return

        target = self.autonomous_waypoints[self.current_waypoint_index]
        if (self.goal_pos is None or force or not self._positions_close(self.goal_pos, target, tol=1e-5)):
            self._assign_goal(target, mode="auto", announce=False)

    def _advance_autonomous_route(self, previous_goal: Optional[Tuple[float, float]]) -> None:
        """Advance to the next waypoint once the current goal has been achieved."""
        if not self.ai_enabled or not self.autonomous_waypoints:
            return

        if previous_goal is None or self.goal_pos is not None:
            return

        if self.autonomy_current_goal and self._positions_close(previous_goal, self.autonomy_current_goal):
            self.current_waypoint_index += 1
            self.autonomy_current_goal = None
            if self.current_waypoint_index >= len(self.autonomous_waypoints):
                print("Autonomous route complete.")
                return
            self._ensure_autonomous_goal(force=True)
        else:
            # If the last goal was user-defined, resume autonomous tracking if idle.
            self._ensure_autonomous_goal(force=False)

    def _find_marker_position(self, keyword: str) -> Optional[Tuple[float, float]]:
        """Locate the first marker whose name contains the given keyword."""
        keyword = keyword.lower()
        for marker in self.maze.markers:
            name = getattr(marker, 'name', '')
            if keyword in name.lower():
                return (marker.x, marker.y)
        return None

    def _plan_autonomous_route(self, resolution: float, clearance: float) -> List[Tuple[float, float]]:
        """Compute a waypoint list from the start marker to the goal marker."""
        start = self._find_marker_position('start')
        goal = self._find_marker_position('goal')
        if not start or not goal:
            return []

        half_w = self.maze.width / 2.0
        half_h = self.maze.height / 2.0

        def frange(min_val: float, max_val: float, step: float) -> List[float]:
            values = []
            current = min_val
            while current <= max_val + 1e-9:
                values.append(round(current, 4))
                current += step
            return values

        x_coords = frange(-half_w + resolution / 2.0, half_w - resolution / 2.0, resolution)
        y_coords = frange(-half_h + resolution / 2.0, half_h - resolution / 2.0, resolution)

        margin = self.robot_radius + clearance

        def cell_free(px: float, py: float) -> bool:
            for wall in self.maze.walls:
                half_x, half_y = self._wall_half_extents(wall)
                if abs(px - wall.x) <= (half_x + margin) and abs(py - wall.y) <= (half_y + margin):
                    return False
            return True

        grid = [[cell_free(x, y) for x in x_coords] for y in y_coords]

        def nearest_free(point: Tuple[float, float]) -> Optional[Tuple[int, int]]:
            px, py = point
            best: Optional[Tuple[int, int]] = None
            best_dist = float('inf')
            for iy, y in enumerate(y_coords):
                for ix, x in enumerate(x_coords):
                    if not grid[iy][ix]:
                        continue
                    dist = (px - x) ** 2 + (py - y) ** 2
                    if dist < best_dist:
                        best_dist = dist
                        best = (ix, iy)
            return best

        start_idx = nearest_free(start)
        goal_idx = nearest_free(goal)
        if start_idx is None or goal_idx is None:
            return []

        def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> float:
            ax, ay = a
            bx, by = b
            return math.hypot(x_coords[ax] - x_coords[bx], y_coords[ay] - y_coords[by])

        open_set: List[Tuple[float, float, Tuple[int, int]]] = []
        heapq.heappush(open_set, (heuristic(start_idx, goal_idx), 0.0, start_idx))
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        g_score: Dict[Tuple[int, int], float] = {start_idx: 0.0}

        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]

        while open_set:
            _, current_cost, current = heapq.heappop(open_set)
            if current == goal_idx:
                break
            if current_cost > g_score.get(current, float('inf')) + 1e-9:
                continue

            cx, cy = current
            for dx, dy in directions:
                nx, ny = cx + dx, cy + dy
                if nx < 0 or ny < 0 or nx >= len(x_coords) or ny >= len(y_coords):
                    continue
                if not grid[ny][nx]:
                    continue

                tentative = current_cost + resolution
                neighbor = (nx, ny)
                if tentative + 1e-9 < g_score.get(neighbor, float('inf')):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative
                    priority = tentative + heuristic(neighbor, goal_idx)
                    heapq.heappush(open_set, (priority, tentative, neighbor))

        if goal_idx not in g_score:
            return []

        path_cells = [goal_idx]
        current = goal_idx
        while current != start_idx:
            current = came_from[current]
            path_cells.append(current)
        path_cells.reverse()

        raw_waypoints = [(x_coords[ix], y_coords[iy]) for (ix, iy) in path_cells]

        def direction_key(p0: Tuple[float, float], p1: Tuple[float, float]) -> Tuple[int, int]:
            vx = p1[0] - p0[0]
            vy = p1[1] - p0[1]
            length = math.hypot(vx, vy)
            if length < 1e-6:
                return (0, 0)
            return (int(round(vx / length)), int(round(vy / length)))

        simplified: List[Tuple[float, float]] = []
        if raw_waypoints:
            simplified.append(start)
            if len(raw_waypoints) > 1:
                prev_direction = direction_key(start, raw_waypoints[1])
                for idx in range(1, len(raw_waypoints) - 1):
                    current_point = raw_waypoints[idx]
                    next_point = raw_waypoints[idx + 1]
                    direction = direction_key(current_point, next_point)
                    if direction != prev_direction:
                        simplified.append(current_point)
                    prev_direction = direction
                simplified.append(raw_waypoints[-1])
            simplified.append(goal)

        filtered: List[Tuple[float, float]] = []
        for pt in simplified:
            if not filtered or not self._positions_close(pt, filtered[-1], tol=1e-4):
                filtered.append(pt)

        if filtered and self._positions_close(filtered[0], start, tol=1e-4):
            filtered = filtered[1:]

        if not filtered or not self._positions_close(filtered[-1], goal, tol=1e-4):
            filtered.append(goal)

        return filtered

    def _on_maze_changed(self) -> None:
        """Reset robot state and re-compute the autonomy plan for the current maze."""
        self.goal_pos = None
        self.autonomy_current_goal = None
        self.current_waypoint_index = 0
        self.autonomous_waypoints = self._plan_autonomous_route(self.autonomy_resolution, self.autonomy_clearance)
        self._reset_manual_pid()

        start_pos = self._find_marker_position('start')
        if start_pos:
            self.robot_pos = start_pos
            self.robot_angle = 0.0
            self.robot_trail.clear()
            self.robot_trail.append(self.robot_pos)
            resolved_pos, contacts = self._resolve_collisions(self.robot_pos, self.robot_pos)
            self.robot_pos = resolved_pos
            if self.robot_trail:
                self.robot_trail[-1] = self.robot_pos
            self.wall_contacts = contacts

        if self.autonomous_waypoints:
            print(f"Autonomy planned {len(self.autonomous_waypoints)} waypoint(s).")
        else:
            print("Autonomy route unavailable for this maze. Enable manual goals instead.")

        if self.ai_enabled and self.autonomous_waypoints:
            self._ensure_autonomous_goal(force=True)

    def _apply_maze(self, maze: MazeGenerator, loader: Optional[Callable[[], None]] = None) -> None:
        """Apply a new maze definition and trigger related bookkeeping."""
        self.maze = maze
        self.loaded_world_path = getattr(maze, 'world_file', None)
        if loader is not None:
            self._last_maze_loader = loader
        elif not hasattr(self, '_last_maze_loader'):
            self._last_maze_loader = self._load_simple
        self._on_maze_changed()

    def update(self):
        """Update application state"""
        current_time = time.time()
        dt = max(0.0, current_time - self.last_update_time)
        self.last_update_time = current_time

        if self.ros_active and (current_time - self.last_ros_update) > 1.0:
            self.ros_active = False

        if self.ai_enabled:
            self._ensure_autonomous_goal()

        previous_goal = self.goal_pos

        if self.goal_pos and self.manual_navigation_enabled:
            if self.ros_active:
                pass
            else:
                self._update_manual_pid(dt)

        if self.ai_enabled:
            self._advance_autonomous_route(previous_goal)

    def _update_manual_navigation(self, dt: float):
        """Advance the robot toward the goal during manual navigation"""
        if not self.goal_pos:
            return

        self.wall_contacts = []

        target_x, target_y = self.goal_pos
        x, y = self.robot_pos
        vec_x = target_x - x
        vec_y = target_y - y
        distance = math.hypot(vec_x, vec_y)

        if distance < 0.03:
            self.robot_pos = (target_x, target_y)
            self.goal_pos = None
            if not self.robot_trail or math.hypot(self.robot_pos[0] - self.robot_trail[-1][0], self.robot_pos[1] - self.robot_trail[-1][1]) > 0.01:
                self.robot_trail.append(self.robot_pos)
            print("Goal reached")
            return

        desired_angle = math.atan2(vec_y, vec_x)
        angle_diff = (desired_angle - self.robot_angle + math.pi) % (2 * math.pi) - math.pi
        max_turn = self.manual_rotation_speed * dt

        if abs(angle_diff) > max_turn:
            self.robot_angle += max_turn if angle_diff > 0 else -max_turn
        else:
            self.robot_angle = desired_angle

        self.robot_angle = (self.robot_angle + math.pi) % (2 * math.pi) - math.pi

        if abs(angle_diff) < math.radians(12):
            step = min(self.manual_speed * dt, distance)
            if step > 0:
                new_x = x + math.cos(self.robot_angle) * step
                new_y = y + math.sin(self.robot_angle) * step
                old_pos = self.robot_pos
                candidate = (new_x, new_y)
                resolved_pos, contacts = self._resolve_collisions(old_pos, candidate)

                self.robot_pos = resolved_pos
                self.wall_contacts = contacts
                if contacts:
                    self.last_collision_time = time.time()
                if not self.robot_trail or math.hypot(self.robot_pos[0] - self.robot_trail[-1][0], self.robot_pos[1] - self.robot_trail[-1][1]) > 0.01:
                    self.robot_trail.append(self.robot_pos)
        else:
            resolved_pos, contacts = self._resolve_collisions(self.robot_pos, self.robot_pos)
            self.wall_contacts = contacts
            if contacts:
                self.last_collision_time = time.time()

    def draw(self):
        """Draw all elements to the screen"""
        self.screen.fill(GRAY)
        self.draw_maze_view()
        self.draw_control_panel()
        
        self.screen.blit(self.maze_surface, (0, 0))
        self.screen.blit(self.control_panel.surface, self.control_panel_origin)
        
        pygame.display.flip()

    def draw_control_panel(self):
        """Draw the control panel UI"""
        self._sync_controls()
        context = self._build_control_context()
        self.control_panel.render(context)

    def _build_control_context(self) -> Dict[str, Iterable[str]]:
        if self.ros_active:
            ros_status = {"label": "ROS2", "value": "Active", "color": GREEN}
        elif self.ros_node:
            ros_status = {"label": "ROS2", "value": "Idle", "color": ORANGE}
        else:
            ros_status = {"label": "ROS2", "value": "Unavailable", "color": RED}

        sim_status = {"label": "Simulation", "value": "Running" if self.simulation_running else "Stopped", "color": GREEN if self.simulation_running else RED}
        mock_status = {"label": "Mock Robot", "value": "Running" if self.mock_publisher_running else "Stopped", "color": GREEN if self.mock_publisher_running else RED}
        ai_status = {"label": "AI", "value": "Enabled" if self.ai_enabled else "Disabled", "color": GREEN if self.ai_enabled else RED}

        collision_active = self.wall_contacts and (time.time() - self.last_collision_time < 0.5)
        goal_text = f"Goal: ({self.goal_pos[0]:.2f}, {self.goal_pos[1]:.2f})" if self.goal_pos else "Goal: None"

        robot_info = [
            f"Mode: {'ROS' if self.ros_active else 'Manual'}",
            f"Position: ({self.robot_pos[0]:.2f}, {self.robot_pos[1]:.2f})",
            f"Angle: {math.degrees(self.robot_angle):.1f}°",
            goal_text,
            f"Collision: {'YES' if collision_active else 'No'}",
        ]

        maze_info = [
            f"Size: {self.maze.width}m x {self.maze.height}m",
            f"Walls: {len(self.maze.walls)}",
            f"Markers: {len(self.maze.markers)}",
            "Left Click: set goal",
            "Right Click: clear goal",
        ]

        return {
            'status_cards': [ros_status, sim_status, mock_status, ai_status],
            'robot_info': robot_info,
            'maze_info': maze_info,
        }

    def world_to_canvas(self, x: float, y: float) -> Tuple[int, int]:
        """Convert world coordinates to canvas coordinates"""
        canvas_x = int(x * self.scale + self.offset_x)
        canvas_y = int(-y * self.scale + self.offset_y)
        return canvas_x, canvas_y

    def canvas_to_world(self, canvas_x: int, canvas_y: int) -> Tuple[float, float]:
        """Convert canvas coordinates back to world coordinates"""
        x = (canvas_x - self.offset_x) / self.scale
        y = -(canvas_y - self.offset_y) / self.scale
        return x, y

    def draw_maze_view(self):
        """Draw the maze and robot visualization"""
        self.maze_surface.fill(WHITE)
        
        contact_walls = {contact[0] for contact in self.wall_contacts} if self.wall_contacts else set()

        self._draw_grid()
        
        # Draw walls
        for i, wall in enumerate(self.maze.walls):
            self._draw_wall(wall, i < 4, wall in contact_walls)

        # Draw markers
        for marker in self.maze.markers:
            self._draw_marker(marker)

        # Draw navigation goal
        self._draw_goal_indicator()

        # Draw laser scan
        self._draw_laser_scan()

        # Draw robot trail
        self._draw_robot_trail()

        # Draw robot
        self._draw_robot()

        # Draw coordinate system
        self._draw_axes()

        # Draw status
        self._draw_status()

    def _draw_grid(self):
        """Draw background grid"""
        # Vertical lines
        for x in range(int(-self.maze.width / 2), int(self.maze.width / 2) + 1, 5):
            x1, y1 = self.world_to_canvas(x, -self.maze.height / 2)
            x2, y2 = self.world_to_canvas(x, self.maze.height / 2)
            pygame.draw.line(self.maze_surface, LIGHT_GRAY, (x1, y1), (x2, y2), 1)
        
        # Horizontal lines
        for y in range(int(-self.maze.height / 2), int(self.maze.height / 2) + 1, 5):
            x1, y1 = self.world_to_canvas(-self.maze.width / 2, y)
            x2, y2 = self.world_to_canvas(self.maze.width / 2, y)
            pygame.draw.line(self.maze_surface, LIGHT_GRAY, (x1, y1), (x2, y2), 1)

    def _draw_wall(self, wall: MazeWall, is_boundary: bool = False, highlighted: bool = False):
        """Draw a wall on canvas"""
        r, g, b = wall.color
        if highlighted:
            color = ORANGE
        else:
            color = (int(r*255), int(g*255), int(b*255))
        
        if wall.orientation == "horizontal":
            x1 = wall.x - wall.length / 2
            x2 = wall.x + wall.length / 2
            y = wall.y
            
            cx1, cy1 = self.world_to_canvas(x1, y)
            cx2, cy2 = self.world_to_canvas(x2, y)
            pygame.draw.line(self.maze_surface, color, (cx1, cy1), (cx2, cy2), 3)
        else:
            x = wall.x
            y1 = wall.y - wall.length / 2
            y2 = wall.y + wall.length / 2
            
            cx1, cy1 = self.world_to_canvas(x, y1)
            cx2, cy2 = self.world_to_canvas(x, y2)
            pygame.draw.line(self.maze_surface, color, (cx1, cy1), (cx2, cy2), 3)

    def _draw_marker(self, marker: MazeMarker):
        """Draw a marker (goal/start) on canvas"""
        r, g, b = marker.color
        color = (int(r*255), int(g*255), int(b*255))
        
        cx, cy = self.world_to_canvas(marker.x, marker.y)
        radius = int(marker.radius * self.scale)
        
        pygame.draw.circle(self.maze_surface, color, (cx, cy), radius)
        pygame.draw.circle(self.maze_surface, BLACK, (cx, cy), radius, 2)
        
        # Draw label
        label_char = "S" if "start" in marker.name.lower() else "G"
        label_surface = self.font_medium.render(label_char, True, WHITE)
        label_rect = label_surface.get_rect(center=(cx, cy))
        self.maze_surface.blit(label_surface, label_rect)

    def _draw_goal_indicator(self):
        """Visualize the user-selected navigation goal"""
        if not self.goal_pos:
            return

        cx, cy = self.world_to_canvas(self.goal_pos[0], self.goal_pos[1])
        radius = max(6, int(self.goal_indicator_radius * self.scale))

        pygame.draw.circle(self.maze_surface, ORANGE, (cx, cy), radius, 2)
        pygame.draw.line(self.maze_surface, ORANGE, (cx - radius, cy), (cx + radius, cy), 1)
        pygame.draw.line(self.maze_surface, ORANGE, (cx, cy - radius), (cx, cy + radius), 1)

    def _draw_laser_scan(self):
        """Draw laser scan points"""
        if not self.laser_points:
            return
        
        for px, py in self.laser_points:
            cx, cy = self.world_to_canvas(px, py)
            pygame.draw.circle(self.maze_surface, RED, (cx, cy), 2)

    def _draw_robot_trail(self):
        """Draw robot's path trail"""
        if len(self.robot_trail) > 1:
            points = [self.world_to_canvas(pos[0], pos[1]) for pos in self.robot_trail]
            pygame.draw.lines(self.maze_surface, CYAN, False, points, 1)

    def _draw_robot(self):
        """Draw robot body and direction"""
        cx, cy = self.world_to_canvas(self.robot_pos[0], self.robot_pos[1])
        radius = int(self.robot_radius * self.scale)

        collision_active = self.wall_contacts and (time.time() - self.last_collision_time < 0.5)
        body_color = RED if collision_active else BLUE
        outline_color = DARK_BLUE if not collision_active else ORANGE
        
        # Robot body
        pygame.draw.circle(self.maze_surface, body_color, (cx, cy), radius)
        pygame.draw.circle(self.maze_surface, outline_color, (cx, cy), radius, 2)
        
        # Robot direction indicator
        front_x = self.robot_pos[0] + self.robot_radius * math.cos(self.robot_angle)
        front_y = self.robot_pos[1] + self.robot_radius * math.sin(self.robot_angle)
        
        fcx, fcy = self.world_to_canvas(front_x, front_y)
        pygame.draw.line(self.maze_surface, YELLOW, (cx, cy), (fcx, fcy), 2)
        
        # Position label
        pos_text = f"({self.robot_pos[0]:.2f}, {self.robot_pos[1]:.2f})"
        pos_surface = self.font_small.render(pos_text, True, BLACK)
        pos_rect = pos_surface.get_rect(center=(cx, cy - radius - 10))
        self.maze_surface.blit(pos_surface, pos_rect)

    def _draw_axes(self):
        """Draw coordinate axes"""
        ox, oy = self.world_to_canvas(0, 0)
        
        # X-axis (red)
        x_end, y_end = self.world_to_canvas(2, 0)
        pygame.draw.line(self.maze_surface, RED, (ox, oy), (x_end, y_end), 2)
        x_label = self.font_small.render("X", True, RED)
        self.maze_surface.blit(x_label, (x_end + 5, y_end - 5))
        
        # Y-axis (green)
        x_end, y_end = self.world_to_canvas(0, 2)
        pygame.draw.line(self.maze_surface, GREEN, (ox, oy), (x_end, y_end), 2)
        y_label = self.font_small.render("Y", True, GREEN)
        self.maze_surface.blit(y_label, (x_end - 5, y_end - 15))
        
        # Origin
        pygame.draw.circle(self.maze_surface, BLACK, (ox, oy), 3)

    def _draw_status(self):
        """Draw status information"""
        status_text = f"Position: ({self.robot_pos[0]:.2f}, {self.robot_pos[1]:.2f}) | Angle: {math.degrees(self.robot_angle):.1f}°"
        status_surface = self.font_small.render(status_text, True, BLACK)
        self.maze_surface.blit(status_surface, (10, 10))

    def _start_ros_listener(self):
        """Start ROS2 listener thread"""
        if not ROS2_AVAILABLE:
            print("ROS2 not available. Cannot start listener.")
            return
        
        self.app_running = True
        self.ros_thread = threading.Thread(target=self._ros_listener_thread, daemon=True)
        self.ros_thread.start()

    def _ros_listener_thread(self):
        """ROS2 listener thread"""
        try:
            if not rclpy.ok():
                rclpy.init()
            
            def update_callback(pos, angle, laser_ranges):
                self.robot_pos = pos
                self.robot_angle = angle

                if not self.robot_trail or math.hypot(pos[0] - self.robot_trail[-1][0], pos[1] - self.robot_trail[-1][1]) > 0.01:
                    self.robot_trail.append(pos)
                self.ros_active = True
                self.last_ros_update = time.time()

                if laser_ranges:
                    self.laser_points = self._process_laser_scan(laser_ranges)
                else:
                    self.laser_points = []

            self.ros_node = RobotOdometryListener(callback=update_callback)
            # Create publisher for nav goals
            try:
                self.nav_goal_pub = self.ros_node.create_publisher(PointStamped, '/nav_goal', 10)
            except Exception:
                self.nav_goal_pub = None
            
            while self.app_running and rclpy.ok():
                rclpy.spin_once(self.ros_node, timeout_sec=0.1)
        except Exception as e:
            print(f"ROS2 Error: {e}")
        finally:
            if self.ros_node:
                self.ros_node.destroy_node()
            if rclpy.ok():
                rclpy.shutdown()

    def _process_laser_scan(self, laser_ranges):
        """Convert laser scan to points for visualization"""
        points = []
        if not laser_ranges:
            return points

        angle_min = -math.pi / 2
        angle_increment = math.pi / len(laser_ranges)
        
        for i, r in enumerate(laser_ranges):
            if r > 0.1 and r < 4.0:  # Filter valid ranges
                angle = angle_min + i * angle_increment + self.robot_angle
                px = self.robot_pos[0] + r * math.cos(angle)
                py = self.robot_pos[1] + r * math.sin(angle)
                points.append((px, py))
        
        return points

    def _update_manual_pid(self, dt: float):
        """Fallback PID navigation using simulated lidar when ROS inactive."""
        if not self.goal_pos:
            return

        cfg = self.manual_pid_config
        pid_state = self.manual_pid_state

        now = time.time()
        if pid_state['last_time'] is None:
            pid_state['last_time'] = now
            return

        dt = max(1e-3, now - pid_state['last_time'])
        pid_state['last_time'] = now

        if self.wall_contacts:
            self.last_collision_time = now

        dx = self.goal_pos[0] - self.robot_pos[0]
        dy = self.goal_pos[1] - self.robot_pos[1]
        distance = math.hypot(dx, dy)

        if distance < cfg['goal_threshold']:
            self._reset_manual_pid()
            self.goal_pos = None
            print("Manual PID goal reached")
            return

        self.manual_pid_lidar = self._simulate_manual_lidar()
        front_clear = min(self.manual_pid_lidar[16:20]) if len(self.manual_pid_lidar) >= 20 else min(self.manual_pid_lidar)
        left_clear = min(self.manual_pid_lidar[:18])
        right_clear = min(self.manual_pid_lidar[18:])

        desired_heading = math.atan2(dy, dx)
        if front_clear < cfg['slowdown_distance']:
            bias = cfg['avoid_bias'] * (0.6 if front_clear < cfg['obstacle_threshold'] else 1.0)
            desired_heading = (desired_heading + (bias if left_clear >= right_clear else -bias) + math.pi) % (2 * math.pi) - math.pi

        heading_error = (desired_heading - self.robot_angle + math.pi) % (2 * math.pi) - math.pi
        distance_error = distance

        pid_state['distance_integral'] += distance_error * dt
        pid_state['distance_integral'] = max(-cfg['integral_limit'], min(cfg['integral_limit'], pid_state['distance_integral']))
        distance_derivative = (distance_error - pid_state['distance_prev_error']) / dt

        pid_state['heading_integral'] += heading_error * dt
        pid_state['heading_integral'] = max(-cfg['integral_limit'], min(cfg['integral_limit'], pid_state['heading_integral']))
        heading_derivative = (heading_error - pid_state['heading_prev_error']) / dt

        linear_speed = (
            cfg['linear_kp'] * distance_error
            + cfg['linear_ki'] * pid_state['distance_integral']
            + cfg['linear_kd'] * distance_derivative
        )
        angular_speed = (
            cfg['heading_kp'] * heading_error
            + cfg['heading_ki'] * pid_state['heading_integral']
            + cfg['heading_kd'] * heading_derivative
        )

        pid_state['distance_prev_error'] = distance_error
        pid_state['heading_prev_error'] = heading_error

        linear_speed = max(-cfg['max_linear'], min(cfg['max_linear'], linear_speed))
        angular_speed = max(-cfg['max_angular'], min(cfg['max_angular'], angular_speed))

        recently_collided = self.wall_contacts and (time.time() - self.last_collision_time < cfg['collision_memory'])

        if front_clear < cfg['obstacle_threshold'] or recently_collided:
            linear_speed = -cfg['backup_speed']
            turn_dir = 1.0 if left_clear >= right_clear else -1.0
            angular_speed = turn_dir * cfg['max_angular']
        elif front_clear < cfg['slowdown_distance']:
            scale = max(0.15, front_clear / cfg['slowdown_distance'])
            linear_speed *= scale

        self.robot_angle = (self.robot_angle + angular_speed * dt + math.pi) % (2 * math.pi) - math.pi
        move_step = linear_speed * dt
        new_x = self.robot_pos[0] + math.cos(self.robot_angle) * move_step
        new_y = self.robot_pos[1] + math.sin(self.robot_angle) * move_step

        resolved_pos, contacts = self._resolve_collisions(self.robot_pos, (new_x, new_y))
        self.robot_pos = resolved_pos
        self.wall_contacts = contacts
        if contacts:
            self.last_collision_time = time.time()

        if not self.robot_trail or math.hypot(self.robot_pos[0] - self.robot_trail[-1][0], self.robot_pos[1] - self.robot_trail[-1][1]) > 0.01:
            self.robot_trail.append(self.robot_pos)

    def _simulate_manual_lidar(self, samples: int = 36, max_range: float = 2.5):
        """Cast rays against maze walls for manual PID obstacle avoidance."""
        readings = []
        angle_start = -math.pi / 2
        angle_increment = math.pi / samples

        for i in range(samples):
            ray_angle = self.robot_angle + angle_start + i * angle_increment
            readings.append(self._distance_to_walls(ray_angle, max_range))

        return readings

    def _distance_to_walls(self, ray_angle: float, max_range: float) -> float:
        """Find distance from robot to maze walls along a ray."""
        origin_x, origin_y = self.robot_pos
        min_distance = max_range

        dir_x = math.cos(ray_angle)
        dir_y = math.sin(ray_angle)

        for wall in self.maze.walls:
            half_x, half_y = self._wall_half_extents(wall)
            rect_min_x = wall.x - half_x - self.robot_radius
            rect_max_x = wall.x + half_x + self.robot_radius
            rect_min_y = wall.y - half_y - self.robot_radius
            rect_max_y = wall.y + half_y + self.robot_radius

            distance = self._ray_box_intersection(origin_x, origin_y, dir_x, dir_y, rect_min_x, rect_max_x, rect_min_y, rect_max_y)
            if distance is not None and 0.0 < distance < min_distance:
                min_distance = distance

        return min_distance

    def _ray_box_intersection(self, ox, oy, dx, dy, min_x, max_x, min_y, max_y):
        """Calculate intersection of a ray with an axis-aligned box."""
        t_min = 0.0
        t_max = float('inf')

        if abs(dx) < 1e-6:
            if ox < min_x or ox > max_x:
                return None
        else:
            inv_dx = 1.0 / dx
            t1 = (min_x - ox) * inv_dx
            t2 = (max_x - ox) * inv_dx
            t_min = max(t_min, min(t1, t2))
            t_max = min(t_max, max(t1, t2))

        if abs(dy) < 1e-6:
            if oy < min_y or oy > max_y:
                return None
        else:
            inv_dy = 1.0 / dy
            t1 = (min_y - oy) * inv_dy
            t2 = (max_y - oy) * inv_dy
            t_min = max(t_min, min(t1, t2))
            t_max = min(t_max, max(t1, t2))

        if t_max >= max(t_min, 0.0):
            return t_min
        return None

    def _load_world_preset(self, preset_key: str, loader: Callable[[], None]) -> None:
        preset = WORLD_PRESETS.get(preset_key)
        if not preset:
            print(f"Unknown world preset '{preset_key}'.")
            return

        maze = load_maze_from_world(
            preset['file'],
            base_path=WORLDS_DIR,
            robot_radius=self.robot_radius,
            default_start=preset.get('start'),
            default_goal=preset.get('goal'),
        )

        if maze is None:
            print(f"Falling back to procedural maze for preset '{preset_key}'.")
            fallback = MazeGenerator(width=10.0, height=10.0)
            self._apply_maze(fallback, loader)
            self.current_world_key = None
            return

        self.current_world_key = preset_key
        self._apply_maze(maze, loader)

    def _reset_manual_pid(self):
        self.manual_pid_state = {
            'distance_integral': 0.0,
            'distance_prev_error': 0.0,
            'heading_integral': 0.0,
            'heading_prev_error': 0.0,
            'last_time': None,
        }

    def _resolve_collisions(self, old_pos: Tuple[float, float], candidate_pos: Tuple[float, float]):
        """Push the robot out of maze walls if the candidate position intersects."""
        cx, cy = candidate_pos
        contacts: List[Tuple[MazeWall, Tuple[float, float]]] = []

        for _ in range(4):
            collided = False
            for wall in self.maze.walls:
                half_x, half_y = self._wall_half_extents(wall)
                rect_min_x = wall.x - half_x
                rect_max_x = wall.x + half_x
                rect_min_y = wall.y - half_y
                rect_max_y = wall.y + half_y

                closest_x = max(rect_min_x, min(cx, rect_max_x))
                closest_y = max(rect_min_y, min(cy, rect_max_y))
                dx = cx - closest_x
                dy = cy - closest_y
                distance_sq = dx * dx + dy * dy
                radius = self.robot_radius

                if distance_sq < radius * radius - 1e-9:
                    distance = math.sqrt(max(distance_sq, 1e-12))
                    if distance == 0.0:
                        nx, ny = 1.0, 0.0
                    else:
                        nx, ny = dx / distance, dy / distance
                    correction = radius - distance + 1e-3
                    cx += nx * correction
                    cy += ny * correction
                    contacts.append((wall, (nx, ny)))
                    collided = True
            if not collided:
                break

        if contacts:
            unique_contacts: List[Tuple[MazeWall, Tuple[float, float]]] = []
            seen = set()
            for wall, normal in contacts:
                if wall not in seen:
                    unique_contacts.append((wall, normal))
                    seen.add(wall)
            contacts = unique_contacts

        return (cx, cy), contacts

    def _wall_half_extents(self, wall: MazeWall) -> Tuple[float, float]:
        """Return half extents (width/2, height/2) for a wall rectangle."""
        if wall.orientation == "horizontal":
            return wall.length / 2.0, wall.thickness / 2.0
        return wall.thickness / 2.0, wall.length / 2.0

    def _load_world_preset(self, preset_key: str, loader: Callable[[], None]) -> None:
        preset = WORLD_PRESETS.get(preset_key)
        if not preset:
            print(f"Unknown world preset '{preset_key}'.")
            return

        maze = load_maze_from_world(
            preset['file'],
            base_path=WORLDS_DIR,
            robot_radius=self.robot_radius,
            default_start=preset.get('start'),
            default_goal=preset.get('goal'),
        )

        if maze is None:
            print(f"Falling back to procedural maze for preset '{preset_key}'.")
            fallback = MazeGenerator(width=10.0, height=10.0)
            self.current_world_key = None
            self._apply_maze(fallback, loader)
            return

        self.current_world_key = preset_key
        self._apply_maze(maze, loader)

    def _load_simple(self):
        """Load simple maze"""
        self._load_world_preset('simple', self._load_simple)

    def _load_corridor(self):
        """Load corridor maze"""
        self._load_world_preset('corridor', self._load_corridor)

    def _load_grid(self):
        """Load grid maze"""
        self._load_world_preset('grid', self._load_grid)

    def _load_spiral(self):
        """Load spiral maze"""
        self._load_world_preset('spiral', self._load_spiral)

    def _load_challenge(self):
        """Load challenge maze"""
        self._load_world_preset('challenge', self._load_challenge)

    def _start_simulation(self):
        """Start Gazebo simulation"""
        if self.simulation_running:
            print("Simulation is already running")
            return
        
        try:
            env = os.environ.copy()
            env['TURTLEBOT3_MODEL'] = 'burger'
            cmd = ['ros2', 'launch', 'turtlebot3_maze', 'slam_simple.launch.py']
            self.simulation_process = subprocess.Popen(
                cmd, cwd='/home/dimuthuaro/turtlebot3_ws', env=env,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            self.simulation_running = True
            print("Starting Gazebo simulation...")
        except Exception as e:
            print(f"Failed to start simulation: {e}")

    def _stop_simulation(self):
        """Stop Gazebo simulation"""
        if not self.simulation_running:
            print("Simulation is not running")
            return
        
        try:
            if self.simulation_process:
                self.simulation_process.terminate()
                try:
                    self.simulation_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.simulation_process.kill()
                    self.simulation_process.wait()
            
            subprocess.run(['pkill', '-f', 'ros2 launch.*slam_simple'], check=False)
            subprocess.run(['pkill', '-f', 'gazebo'], check=False)
            
            self.simulation_running = False
            print("Simulation stopped")
        except Exception as e:
            print(f"Failed to stop simulation: {e}")

    def _start_mock_robot(self):
        """Start mock robot publisher"""
        if self.mock_publisher_running:
            print("Mock robot is already running")
            return
        
        try:
            env = os.environ.copy()
            cmd = ['python3', 'mock_robot_publisher.py']
            self.mock_publisher_process = subprocess.Popen(
                cmd, cwd='/home/dimuthuaro/turtlebot3_ws/src/turtlebot3_maze', env=env,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            self.mock_publisher_running = True
            print("Mock robot started")
        except Exception as e:
            print(f"Failed to start mock robot: {e}")

    def _stop_mock_robot(self):
        """Stop mock robot publisher"""
        if not self.mock_publisher_running:
            print("Mock robot is not running")
            return
        
        try:
            if self.mock_publisher_process:
                self.mock_publisher_process.terminate()
                try:
                    self.mock_publisher_process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.mock_publisher_process.kill()
                    self.mock_publisher_process.wait()
            
            subprocess.run(['pkill', '-f', 'mock_robot_publisher'], check=False)
            self.mock_publisher_running = False
            print("Mock robot stopped")
        except Exception as e:
            print(f"Failed to stop mock robot: {e}")

    def on_closing(self):
        """Handle window closing"""
        self.app_running = False
        if self.ros_thread:
            self.ros_thread.join(timeout=1)
        
        # Stop any running simulations
        if self.simulation_running:
            self._stop_simulation()
        if self.mock_publisher_running:
            self._stop_mock_robot()
        
        pygame.quit()
        sys.exit()

def main():
    """Main entry point"""
    if not ROS2_AVAILABLE:
        print("Warning: ROS2 not found. Visualization will not connect to a robot.")

    app = RobotVisualizerPygame()
    app.run()


if __name__ == "__main__":
    main()
