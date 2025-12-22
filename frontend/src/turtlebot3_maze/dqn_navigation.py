import math
import time

import numpy as np

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PointStamped, Twist
from nav_msgs.msg import Odometry
from sensor_msgs.msg import LaserScan


class DQNNavigation(Node):
    """Goal-seeking controller that uses lidar to turn away from obstacles."""

    def __init__(self):
        super().__init__('dqn_navigation')

        self.laser_sub = self.create_subscription(LaserScan, '/scan', self.laser_callback, 10)
        self.odom_sub = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
        self.goal_sub = self.create_subscription(PointStamped, '/nav_goal', self.goal_callback, 10)
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)

        self.timer = self.create_timer(0.1, self.control_loop)

        # Robot state
        self.full_laser_ranges = None
        self.laser_angle_min = None
        self.laser_angle_increment = None
        self.range_max = 3.5
        self.position = None
        self.yaw = 0.0
        self.goal_point = None

        # PID state
        self.distance_integral = 0.0
        self.distance_prev_error = 0.0
        self.heading_integral = 0.0
        self.heading_prev_error = 0.0
        self.last_control_time = None

        # Controller parameters
        self.goal_reached_threshold = self.declare_parameter('goal_reached_threshold', 0.15).value
        self.max_linear_speed = self.declare_parameter('max_linear_speed', 0.3).value
        self.max_angular_speed = self.declare_parameter('max_angular_speed', 1.2).value
        self.obstacle_threshold = self.declare_parameter('obstacle_threshold', 0.4).value
        self.obstacle_slowdown_distance = self.declare_parameter('obstacle_slowdown_distance', 0.8).value
        self.obstacle_turn_speed = self.declare_parameter('obstacle_turn_speed', 0.9).value

        # PID gains
        self.linear_kp = self.declare_parameter('linear_kp', 0.8).value
        self.linear_ki = self.declare_parameter('linear_ki', 0.0).value
        self.linear_kd = self.declare_parameter('linear_kd', 0.1).value
        self.heading_kp = self.declare_parameter('heading_kp', 2.0).value
        self.heading_ki = self.declare_parameter('heading_ki', 0.0).value
        self.heading_kd = self.declare_parameter('heading_kd', 0.3).value
        self.integral_limit = self.declare_parameter('integral_limit', 1.0).value

    def laser_callback(self, msg: LaserScan):
        ranges = np.array(msg.ranges, dtype=float)
        max_range = msg.range_max if msg.range_max > 0 else self.range_max
        ranges = np.nan_to_num(ranges, nan=max_range, posinf=max_range, neginf=0.0)
        ranges = np.clip(ranges, 0.0, max_range)

        self.full_laser_ranges = ranges
        self.laser_angle_min = msg.angle_min
        self.laser_angle_increment = msg.angle_increment
        self.range_max = max_range

    def odom_callback(self, msg: Odometry):
        self.position = msg.pose.pose.position
        q = msg.pose.pose.orientation
        siny_cosp = 2.0 * (q.w * q.z + q.x * q.y)
        cosy_cosp = 1.0 - 2.0 * (q.y * q.y + q.z * q.z)
        self.yaw = math.atan2(siny_cosp, cosy_cosp)

    def goal_callback(self, msg: PointStamped):
        self.goal_point = (float(msg.point.x), float(msg.point.y))
        self._reset_pid()

    def control_loop(self):
        if self.full_laser_ranges is None or self.position is None:
            return

        twist = Twist()

        if self.goal_point is None:
            self.cmd_vel_pub.publish(twist)
            return

        current_time = time.time()
        if self.last_control_time is None:
            dt = 0.0
        else:
            dt = current_time - self.last_control_time
        self.last_control_time = current_time

        dx = self.goal_point[0] - self.position.x
        dy = self.goal_point[1] - self.position.y
        distance = math.hypot(dx, dy)

        if distance < self.goal_reached_threshold:
            self._reset_pid()
            self.cmd_vel_pub.publish(twist)
            return

        front_clear = self._min_range_between(-0.35, 0.35)
        left_clear = self._min_range_between(0.0, 1.1)
        right_clear = self._min_range_between(-1.1, 0.0)

        desired_heading = math.atan2(dy, dx)
        if front_clear < self.obstacle_slowdown_distance:
            bias = 0.45 if front_clear < self.obstacle_threshold else 0.3
            desired_heading = self._wrap_angle(desired_heading + (bias if left_clear >= right_clear else -bias))

        heading_error = self._wrap_angle(desired_heading - self.yaw)
        distance_error = distance

        if dt > 0.0:
            self.distance_integral += distance_error * dt
            self.distance_integral = self._clamp(self.distance_integral, -self.integral_limit, self.integral_limit)
            distance_derivative = (distance_error - self.distance_prev_error) / dt
            self.heading_integral += heading_error * dt
            self.heading_integral = self._clamp(self.heading_integral, -self.integral_limit, self.integral_limit)
            heading_derivative = (heading_error - self.heading_prev_error) / dt
        else:
            distance_derivative = 0.0
            heading_derivative = 0.0

        linear_speed = (
            self.linear_kp * distance_error
            + self.linear_ki * self.distance_integral
            + self.linear_kd * distance_derivative
        )
        angular_speed = (
            self.heading_kp * heading_error
            + self.heading_ki * self.heading_integral
            + self.heading_kd * heading_derivative
        )

        self.distance_prev_error = distance_error
        self.heading_prev_error = heading_error

        linear_speed = self._clamp(linear_speed, -self.max_linear_speed, self.max_linear_speed)
        angular_speed = self._clamp(angular_speed, -self.max_angular_speed, self.max_angular_speed)

        if front_clear < self.obstacle_threshold:
            linear_speed = 0.0
            turn_dir = 1.0 if left_clear >= right_clear else -1.0
            angular_speed = turn_dir * self.obstacle_turn_speed
        elif front_clear < self.obstacle_slowdown_distance:
            scale = max(0.15, front_clear / self.obstacle_slowdown_distance)
            linear_speed *= scale

        twist.linear.x = linear_speed
        twist.angular.z = angular_speed
        self.cmd_vel_pub.publish(twist)

    def _min_range_between(self, start_angle: float, end_angle: float) -> float:
        if self.full_laser_ranges is None or self.laser_angle_increment is None:
            return float('inf')

        start_angle, end_angle = sorted((start_angle, end_angle))
        start_idx = int(max(0, math.floor((start_angle - self.laser_angle_min) / self.laser_angle_increment)))
        end_idx = int(min(len(self.full_laser_ranges), math.ceil((end_angle - self.laser_angle_min) / self.laser_angle_increment)))

        if start_idx >= end_idx:
            return float('inf')

        segment = self.full_laser_ranges[start_idx:end_idx]
        if segment.size == 0:
            return float('inf')

        return float(np.min(segment))

    @staticmethod
    def _wrap_angle(angle: float) -> float:
        return (angle + math.pi) % (2 * math.pi) - math.pi

    @staticmethod
    def _clamp(value: float, min_value: float, max_value: float) -> float:
        return max(min_value, min(max_value, value))

    def _reset_pid(self):
        self.distance_integral = 0.0
        self.distance_prev_error = 0.0
        self.heading_integral = 0.0
        self.heading_prev_error = 0.0
        self.last_control_time = None

def main():
    rclpy.init()
    node = DQNNavigation()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()