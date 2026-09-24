cmake_minimum_required(VERSION 3.20)
project(veldren_native LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(ZLIB REQUIRED)

add_library(veldren_core STATIC src/core.cpp src/desktop.cpp)
target_include_directories(veldren_core PUBLIC include)

add_executable(veldren-desktop src/desktop_main.cpp src/desktop_renderer.cpp)
target_link_libraries(veldren-desktop PRIVATE veldren_core ZLIB::ZLIB ${CMAKE_DL_LIBS})

add_executable(veldren-desktop-test tests/desktop_test.cpp)
target_link_libraries(veldren-desktop-test PRIVATE veldren_core)

if(MSVC)
  target_compile_options(veldren_core PRIVATE /W4 /WX)
  target_compile_options(veldren-desktop PRIVATE /W4 /WX)
  target_compile_options(veldren-desktop-test PRIVATE /W4 /WX)
else()
  target_compile_options(veldren_core PRIVATE -Wall -Wextra -Werror)
  target_compile_options(veldren-desktop PRIVATE -Wall -Wextra -Werror)
  target_compile_options(veldren-desktop-test PRIVATE -Wall -Wextra -Werror)
endif()

enable_testing()
add_test(NAME desktop-core COMMAND veldren-desktop-test)
set_tests_properties(desktop-core PROPERTIES WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})
add_test(NAME desktop-headless COMMAND veldren-desktop --headless --frames=240 --assets=..)
set_tests_properties(desktop-headless PROPERTIES WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})
