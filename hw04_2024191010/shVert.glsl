#version 300 es

in vec2 a_position;
in vec4 a_color;
uniform mat4 u_bigwingtransform;
uniform mat4 u_leftwingtransform;
uniform mat4 u_rightwingtransform;

out vec4 v_color;

void main() {
    gl_Position = u_bigwingtransform * u_leftwingtransform* u_rightwingtransform* vec4(a_position, 0.0, 1.0);
    v_color = a_color;
} 