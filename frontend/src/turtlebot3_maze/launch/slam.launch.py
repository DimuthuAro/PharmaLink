from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import ExecuteProcess, DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from ament_index_python.packages import get_package_share_directory
import os

def generate_launch_description():
    pkg_share = get_package_share_directory('turtlebot3_maze')
    maze_world = os.path.join(pkg_share, 'worlds', 'maze.world')
    rviz_config = os.path.join(pkg_share, 'rviz', 'slam.rviz')
    
    return LaunchDescription([
        # Set TurtleBot3 model
        DeclareLaunchArgument(
            'model',
            default_value='burger',
            description='TurtleBot3 model'
        ),
        
        # Gazebo launch
        ExecuteProcess(
            cmd=['gazebo', '--verbose', '-s', 'libgazebo_ros_init.so', '-s', 'libgazebo_ros_factory.so',
                 maze_world],
            output='screen'
        ),
        
        # Spawn TurtleBot3
        Node(
            package='gazebo_ros',
            executable='spawn_entity.py',
            arguments=['-entity', 'turtlebot3_burger', '-x', '0.0', '-y', '0.0', '-z', '0.01',
                       '-file', 'turtlebot3_burger/model.sdf'],
            output='screen'
        ),
        
        # Robot State Publisher
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            name='robot_state_publisher',
            output='screen',
            parameters=[{'use_sim_time': True}]
        ),
        
        # SLAM Toolbox
        Node(
            package='slam_toolbox',
            executable='async_slam_toolbox_node',
            name='slam_toolbox',
            output='screen',
            parameters=[{
                'use_sim_time': True,
                'base_frame': 'base_footprint',
                'odom_frame': 'odom',
                'map_frame': 'map'
            }]
        ),
        
        # RVIZ
        Node(
            package='rviz2',
            executable='rviz2',
            name='rviz2',
            arguments=['-d', rviz_config],
            output='screen'
        )
    ])