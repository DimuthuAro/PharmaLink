from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import ExecuteProcess, DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from ament_index_python.packages import get_package_share_directory
import os

def generate_launch_description():
    pkg_share = get_package_share_directory('turtlebot3_maze')
    tb3_desc_share = get_package_share_directory('turtlebot3_description')
    
    maze_world = os.path.join(pkg_share, 'worlds', 'maze.world')
    rviz_config = os.path.join(pkg_share, 'rviz', 'slam.rviz')
    tb3_urdf = os.path.join(tb3_desc_share, 'urdf', 'turtlebot3_burger.urdf')
    
    # Load robot description
    with open(tb3_urdf, 'r') as f:
        robot_desc = f.read()
    
    return LaunchDescription([
        # Gazebo launch (direct call)
        ExecuteProcess(
            cmd=['gazebo', '--verbose', maze_world],
            output='screen'
        ),
        
        # Robot State Publisher
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            name='robot_state_publisher',
            output='screen',
            parameters=[
                {'use_sim_time': True},
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
                'use_sim_time': True,
                'base_frame': 'base_footprint',
                'odom_frame': 'odom',
                'map_frame': 'map'
            }]
        ),
        
        # RVIZ (disabled due to library issues)
        # Node(
        #     package='rviz2',
        #     executable='rviz2',
        #     name='rviz2',
        #     arguments=['-d', rviz_config],
        #     output='screen'
        # )
    ])

