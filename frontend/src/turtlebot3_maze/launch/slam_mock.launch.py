from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import ExecuteProcess
from ament_index_python.packages import get_package_share_directory
import os
import sys

def generate_launch_description():
    pkg_share = get_package_share_directory('turtlebot3_maze')
    tb3_desc_share = get_package_share_directory('turtlebot3_description')
    
    tb3_urdf = os.path.join(tb3_desc_share, 'urdf', 'turtlebot3_burger.urdf')
    
    # Find the install root and construct path to mock robot
    # pkg_share is like: /home/.../install/turtlebot3_maze/share/turtlebot3_maze
    install_root = os.path.dirname(os.path.dirname(pkg_share))  # Remove /share/turtlebot3_maze
    mock_robot_py = os.path.join(install_root, 'lib', 'turtlebot3_maze', 'mock_robot_publisher.py')
    
    # Load robot description
    with open(tb3_urdf, 'r') as f:
        robot_desc = f.read()
    
    return LaunchDescription([
        # Mock Robot Publisher (simulates Gazebo without GUI issues)
        ExecuteProcess(
            cmd=[sys.executable, mock_robot_py],
            output='screen'
        ),
        
        # Robot State Publisher
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            name='robot_state_publisher',
            output='screen',
            parameters=[
                {'use_sim_time': False},
                {'robot_description': robot_desc}
            ]
        ),
        
        # SLAM Toolbox
        Node(
            package='slam_toolbox',
            executable='async_slam_toolbox_node',
            name='slam_toolbox',
            output='screen',
            parameters=[{
                'use_sim_time': False,
                'base_frame': 'base_footprint',
                'odom_frame': 'odom',
                'map_frame': 'map'
            }]
        ),
    ])
