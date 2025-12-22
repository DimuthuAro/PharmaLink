#!/usr/bin/env python3
"""TurtleBot3 Maze mock robot publisher with reactive collision handling."""

import math
import os
import sys
from typing import List, Optional, Tuple

import rclpy
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from tf2_ros import TransformBroadcaster
from geometry_msgs.msg import TransformStamped

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from maze_generator import MazeGenerator


def build_maze(preset: str) -> MazeGenerator:
    """Create a maze configuration matching the visualizer presets."""
    preset = preset.lower()
    if preset == 'simple':
        maze = MazeGenerator(width=10.0, height=10.0)
        maze.add_wall(-2.0, 2.0, 3.0, "vertical")
        maze.add_wall(2.0, 1.0, 3.0, "vertical")
        maze.add_wall(-1.0, -1.5, 2.5, "horizontal")
        maze.add_start(-4.0, -3.5)
        maze.add_goal(4.0, 3.5)
        return maze
    if preset == 'corridor':
        maze = MazeGenerator(width=12.0, height=8.0)
        maze.add_wall(-4.0, 1.5, 4.0, "horizontal")
        maze.add_wall(0.0, -1.5, 4.0, "horizontal")
        maze.add_wall(-2.0, 0.0, 1.5, "vertical")
        maze.add_wall(2.0, 0.0, 1.5, "vertical")
        maze.add_start(-5.5, 0.0)
        maze.add_goal(5.5, 0.0)
        return maze
    if preset == 'grid':
        maze = MazeGenerator(width=12.0, height=12.0)
        for x in [-3, 0, 3]:
            for y_start, y_end in [(-5, -2), (-1, 2), (3, 6)]:
                length = y_end - y_start
                maze.add_wall(x, (y_start + y_end) / 2, length, "vertical")
        for y in [-3.5, 0, 3.5]:
            for x_start, x_end in [(-5.5, -2), (-1, 2), (3, 5.5)]:
                length = x_end - x_start
                maze.add_wall((x_start + x_end) / 2, y, length, "horizontal")
        maze.add_start(-5.0, -5.0, "start_marker")
        maze.add_goal(5.0, 5.0, "goal_marker")
        return maze
    if preset == 'spiral':
        maze = MazeGenerator(width=14.0, height=14.0)
        maze.add_wall(-6.0, 0, 12.0, "vertical")
        maze.add_wall(6.0, 0, 12.0, "vertical")
        maze.add_wall(0, -6.0, 12.0, "horizontal")
        maze.add_wall(0, 2.0, 8.0, "horizontal")
        maze.add_wall(-4.0, -2.0, 8.0, "vertical")
        maze.add_wall(0, -4.0, 8.0, "horizontal")
        maze.add_wall(2.0, 0, 4.0, "vertical")
        maze.add_start(-6.5, -6.5)
        maze.add_goal(0, 0)
        return maze
    if preset == 'challenge':
        maze = MazeGenerator(width=16.0, height=16.0)
        maze.add_wall(-4.0, 4.0, 4.0, "vertical")
        maze.add_wall(-2.0, 2.0, 4.0, "horizontal")
        maze.add_wall(2.0, 4.0, 4.0, "vertical")
        maze.add_wall(4.0, 2.0, 4.0, "horizontal")
        maze.add_wall(-4.0, -2.0, 4.0, "vertical")
        maze.add_wall(-2.0, -4.0, 4.0, "horizontal")
        maze.add_wall(2.0, -2.0, 4.0, "vertical")
        maze.add_wall(4.0, -4.0, 4.0, "horizontal")
        maze.add_wall(0, 5.5, 1.0, "horizontal")
        maze.add_wall(0, -5.5, 1.0, "horizontal")
        maze.add_wall(-5.5, 0, 1.0, "vertical")
        maze.add_wall(5.5, 0, 1.0, "vertical")
        maze.add_start(-7.0, -7.0)
        maze.add_goal(7.0, 7.0)
        return maze
    # Default to simple configuration for unknown presets.
    maze = MazeGenerator(width=10.0, height=10.0)
    maze.add_start(-4.0, -3.5)
    maze.add_goal(4.0, 3.5)
    return maze


class MockRobotPublisher(Node):
    """Mock robot that obeys cmd_vel and senses maze walls with virtual lidar."""

    def __init__(self) -> None:
        super().__init__('mock_robot_publisher')

        self.declare_parameter('update_rate', 20.0)
        self.declare_parameter('command_timeout', 0.6)
        self.declare_parameter('maze_preset', 'simple')
        self.declare_parameter('lidar_samples', 180)
        self.declare_parameter('lidar_max_range', 3.5)

        self.update_rate = max(1.0, float(self.get_parameter('update_rate').value))
        self.command_timeout = max(0.1, float(self.get_parameter('command_timeout').value))
        self.timer_period = 1.0 / self.update_rate
        self.lidar_samples = max(10, int(self.get_parameter('lidar_samples').value))
        self.lidar_max_range = float(self.get_parameter('lidar_max_range').value)
        self.maze_preset = str(self.get_parameter('maze_preset').value)

        self.maze = build_maze(self.maze_preset)
        self.robot_radius = 0.15
        self.x, self.y = self._initial_position()
        self.theta = 0.0
        self.linear_cmd = 0.0
        self.angular_cmd = 0.0
        self.last_linear_velocity = 0.0
        self.last_cmd_time = self.get_clock().now()
        self.last_update_time = self.get_clock().now()

        self.odom_pub = self.create_publisher(Odometry, '/odom', 10)
        self.scan_pub = self.create_publisher(LaserScan, '/scan', 10)
        self.tf_broadcaster = TransformBroadcaster(self)
        self.cmd_sub = self.create_subscription(Twist, '/cmd_vel', self.cmd_callback, 10)

        self.timer = self.create_timer(self.timer_period, self.timer_callback)

        self.get_logger().info(
            f"Mock robot publisher ready (maze: {self.maze_preset}, rate: {self.update_rate:.1f} Hz)"
        )

    def cmd_callback(self, msg: Twist) -> None:
        self.linear_cmd = float(msg.linear.x)
        self.angular_cmd = float(msg.angular.z)
        self.last_cmd_time = self.get_clock().now()

    def timer_callback(self) -> None:
        now = self.get_clock().now()
        dt = (now - self.last_update_time).nanoseconds / 1e9
        if dt <= 0.0:
            dt = self.timer_period
        self.last_update_time = now

        if (now - self.last_cmd_time).nanoseconds / 1e9 > self.command_timeout:
            self.linear_cmd = 0.0
            self.angular_cmd = 0.0

        self._integrate_motion(dt)
        scan_readings = self._simulate_lidar()

        self._publish_odom(now)
        self._publish_scan(now, scan_readings)
        self._publish_transform(now)

    def _integrate_motion(self, dt: float) -> None:
        if dt <= 0.0:
            return

        self.theta = self._wrap_angle(self.theta + self.angular_cmd * dt)
        move_step = self.linear_cmd * dt
        target_x = self.x + math.cos(self.theta) * move_step
        target_y = self.y + math.sin(self.theta) * move_step

        new_x, new_y = self._resolve_collisions((self.x, self.y), (target_x, target_y))
        displacement = math.hypot(new_x - self.x, new_y - self.y)
        self.last_linear_velocity = displacement / dt if dt > 0.0 else 0.0
        if self.linear_cmd < 0.0:
            self.last_linear_velocity *= -1.0

        self.x, self.y = new_x, new_y

    def _publish_odom(self, stamp) -> None:
        odom = Odometry()
        odom.header.stamp = stamp.to_msg()
        odom.header.frame_id = 'odom'
        odom.child_frame_id = 'base_footprint'

        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0

        qx, qy, qz, qw = self._yaw_to_quaternion(self.theta)
        odom.pose.pose.orientation.x = qx
        odom.pose.pose.orientation.y = qy
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw

        odom.pose.covariance = [0.05] * 36

        odom.twist.twist.linear.x = self.last_linear_velocity
        odom.twist.twist.linear.y = 0.0
        odom.twist.twist.linear.z = 0.0
        odom.twist.twist.angular.x = 0.0
        odom.twist.twist.angular.y = 0.0
        odom.twist.twist.angular.z = self.angular_cmd
        odom.twist.covariance = [0.02] * 36

        self.odom_pub.publish(odom)

    def _publish_scan(self, stamp, ranges: List[float]) -> None:
        scan = LaserScan()
        scan.header.stamp = stamp.to_msg()
        scan.header.frame_id = 'base_scan'

        scan.angle_min = -math.pi / 2
        scan.angle_max = math.pi / 2
        samples = len(ranges)
        if samples > 1:
            scan.angle_increment = (scan.angle_max - scan.angle_min) / (samples - 1)
            scan.time_increment = self.timer_period / samples
        else:
            scan.angle_increment = 0.0
            scan.time_increment = 0.0
        scan.scan_time = self.timer_period
        scan.range_min = 0.12
        scan.range_max = self.lidar_max_range

        scan.ranges = ranges
        scan.intensities = [1.0] * samples

        self.scan_pub.publish(scan)

    def _publish_transform(self, stamp) -> None:
        transform = TransformStamped()
        transform.header.stamp = stamp.to_msg()
        transform.header.frame_id = 'odom'
        transform.child_frame_id = 'base_footprint'

        transform.transform.translation.x = self.x
        transform.transform.translation.y = self.y
        transform.transform.translation.z = 0.0

        qx, qy, qz, qw = self._yaw_to_quaternion(self.theta)
        transform.transform.rotation.x = qx
        transform.transform.rotation.y = qy
        transform.transform.rotation.z = qz
        transform.transform.rotation.w = qw

        self.tf_broadcaster.sendTransform(transform)

    def _simulate_lidar(self) -> List[float]:
        readings: List[float] = []
        samples = self.lidar_samples
        angle_span = math.pi
        angle_min = -angle_span / 2.0
        angle_increment = angle_span / (samples - 1) if samples > 1 else 0.0

        for idx in range(samples):
            ray_angle = self.theta + angle_min + idx * angle_increment
            distance = self._distance_to_walls(ray_angle, self.lidar_max_range)
            if distance >= self.lidar_max_range - 1e-6:
                readings.append(float('inf'))
            else:
                readings.append(distance)

        return readings

    def _distance_to_walls(self, ray_angle: float, max_range: float) -> float:
        origin_x, origin_y = self.x, self.y
        dir_x = math.cos(ray_angle)
        dir_y = math.sin(ray_angle)
        min_distance = max_range

        for wall in self.maze.walls:
            half_x, half_y = self._wall_half_extents(wall)
            rect_min_x = wall.x - half_x - self.robot_radius
            rect_max_x = wall.x + half_x + self.robot_radius
            rect_min_y = wall.y - half_y - self.robot_radius
            rect_max_y = wall.y + half_y + self.robot_radius

            distance = self._ray_box_intersection(
                origin_x, origin_y, dir_x, dir_y, rect_min_x, rect_max_x, rect_min_y, rect_max_y
            )
            if distance is not None and 0.0 < distance < min_distance:
                min_distance = distance

        return min_distance

    def _resolve_collisions(
        self,
        old_pos: Tuple[float, float],
        candidate_pos: Tuple[float, float],
    ) -> Tuple[float, float]:
        cx, cy = candidate_pos

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
                    collided = True

            if not collided:
                break

        return cx, cy

    @staticmethod
    def _wrap_angle(angle: float) -> float:
        return (angle + math.pi) % (2 * math.pi) - math.pi

    @staticmethod
    def _yaw_to_quaternion(yaw: float) -> Tuple[float, float, float, float]:
        cy = math.cos(yaw * 0.5)
        sy = math.sin(yaw * 0.5)
        return 0.0, 0.0, sy, cy

    def _wall_half_extents(self, wall) -> Tuple[float, float]:
        if wall.orientation == "horizontal":
            return wall.length / 2.0, wall.thickness / 2.0
        return wall.thickness / 2.0, wall.length / 2.0

    def _ray_box_intersection(
        self,
        ox: float,
        oy: float,
        dx: float,
        dy: float,
        min_x: float,
        max_x: float,
        min_y: float,
        max_y: float,
    ) -> Optional[float]:
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

    def _initial_position(self) -> Tuple[float, float]:
        for marker in self.maze.markers:
            name = getattr(marker, 'name', '').lower()
            if 'start' in name:
                return marker.x, marker.y
        return (0.0, 0.0)


def main(args=None):
    try:
        rclpy.init(args=args)
        ros_initialized_here = True
    except RuntimeError:
        ros_initialized_here = False

    node = MockRobotPublisher()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    except Exception as exc:  # pragma: no cover - runtime safety
        print(f"Error during spin: {exc}")
    finally:
        try:
            node.destroy_node()
        except Exception:
            pass
        try:
            if ros_initialized_here and rclpy.ok():
                rclpy.shutdown()
        except Exception:
            pass


if __name__ == '__main__':
    main()
