/*-------------------------------------------------------------------------
08_Transformation.js

canvas의 중심에 한 edge의 길이가 0.3인 정사각형을 그리고, 
이를 크기 변환 (scaling), 회전 (rotation), 이동 (translation) 하는 예제임.
    T는 x, y 방향 모두 +0.5 만큼 translation
    R은 원점을 중심으로 2초당 1회전의 속도로 rotate
    S는 x, y 방향 모두 0.3배로 scale
이라 할 때, 
    keyboard 1은 TRS 순서로 적용
    keyboard 2는 TSR 순서로 적용
    keyboard 3은 RTS 순서로 적용
    keyboard 4는 RST 순서로 적용
    keyboard 5는 STR 순서로 적용
    keyboard 6은 SRT 순서로 적용
    keyboard 7은 원래 위치로 돌아옴
---------------------------------------------------------------------------*/
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let finalBigWingTransform;
let finalLeftWingTransform;
let finalRightWingTransform;
let bigwingrotationAngle = 0;
let smallwingrotationAngle = 0;
let lastTime = 0;
const I=mat4.create();

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupBuffers() {
    const cubeVertices = new Float32Array([
        -0.05,  0.3,  // 기둥 좌상단
        -0.05, -0.3,  // 좌하단
         0.05, -0.3,  // 우하단
         0.05,  0.3,  // 우상단
        -0.3, 0.35, // 큰 날개 좌상단
        -0.3, 0.25, 
         0.3, 0.25, 
         0.3, 0.35, 
        -0.35, 0.325, // 좌측 작은 날개 좌상단
        -0.35, 0.275,
        -0.25, 0.275,
        -0.25, 0.325,
         0.25, 0.325, // 우측 작은 날개 좌상단
         0.25, 0.275,
         0.35, 0.275,
         0.35, 0.325    
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0,2,3,
        4, 5, 6,
        4, 6, 7,
        8,9,10,
        8,10,11,
        12,13,14,
        12,14,15
    ]);

    const cubeColors = new Float32Array([
        0.55, 0.27, 0.07, 1.0,  // 빨간색
        0.55, 0.27, 0.07, 1.0,  // 빨간색
        0.55, 0.27, 0.07, 1.0,  // 빨간색
        0.55, 0.27, 0.07, 1.0,  // 빨간색
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0,
        0.5,0.5,0.5,1.0
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // VBO for position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    // VBO for color
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeColors, gl.STATIC_DRAW);
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);

    // EBO
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}


function getTransformMatrices() {
    const BW = mat4.create();
    const BWR = mat4.create();
    const BWI = mat4.create();

    const LW = mat4.create();
    const LWI = mat4.create();

    const RW = mat4.create();
    const RWI = mat4.create();

    const SWR = mat4.create();

    mat4.translate(BW,BW,[0,-0.3,0]);
    mat4.rotate(BWR, BWR, bigwingrotationAngle, [0, 0, 1]); // rotation about z-axis
    mat4.translate(LW,LW,[+0.3,-0.3,0]);
    mat4.translate(RW,RW,[-0.3,-0.3,0]);
    mat4.rotate(SWR, SWR, smallwingrotationAngle, [0, 0, 1]); // rotation about z-axis
    mat4.invert(BWI,BW);
    mat4.invert(LWI,LW);
    mat4.invert(RWI,RW);
    return { BW, BWR,BWI, LW, LWI,RW,RWI, SWR };
}

function applyTransform() {
    finalBigWingTransform = mat4.create();
    finalLeftWingTransform = mat4.create();
    finalRightWingTransform = mat4.create();

    const { BW, BWR,BWI, LW, LWI,RW,RWI, SWR } = getTransformMatrices();
    
    const transformOrder = {
        'BWR': [BW, BWR, BWI],
        'LWR': [LW, SWR, LWI],
        'RWR': [RW, SWR, RWI],
    };

    transformOrder['BWR'].forEach(matrix => {
            mat4.multiply(finalBigWingTransform, matrix, finalBigWingTransform);
        });
    transformOrder['LWR'].forEach(leftmatrix => {
            mat4.multiply(finalLeftWingTransform, leftmatrix, finalLeftWingTransform);
        });
    transformOrder['RWR'].forEach(rightmatrix => {
            mat4.multiply(finalRightWingTransform, rightmatrix, finalRightWingTransform);
        });

}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw cube
    shader.use();
    gl.bindVertexArray(vao);
    // gl.drawElements(mode, index_count, type, byte_offset);
    shader.setMat4("u_bigwingtransform", I);
    shader.setMat4("u_leftwingtransform", I);
    shader.setMat4("u_rightwingtransform", I);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    shader.setMat4("u_bigwingtransform", finalBigWingTransform);
    shader.setMat4("u_leftwingtransform", I);
    shader.setMat4("u_rightwingtransform", I);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12);
    shader.setMat4("u_bigwingtransform", finalBigWingTransform);
    shader.setMat4("u_leftwingtransform", finalLeftWingTransform);
    shader.setMat4("u_rightwingtransform", I);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 24);  
    shader.setMat4("u_bigwingtransform", finalBigWingTransform);
    shader.setMat4("u_leftwingtransform", I);
    shader.setMat4("u_rightwingtransform", finalRightWingTransform);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 36);

}

function animate(currentTime) {

    if (!lastTime) lastTime = currentTime; // if lastTime == 0
    // deltaTime: 이전 frame에서부터의 elapsed time (in seconds)
    const elapsedTime = (currentTime - lastTime) / 1000;

    bigwingrotationAngle = Math.PI * Math.sin(elapsedTime)*2.0;
    smallwingrotationAngle = Math.PI * Math.sin(elapsedTime)*10.0;
    applyTransform();
    
    render();

    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        finalBigWingTransform = mat4.create();
        finalLeftWingTransform = mat4.create();
        finalRightWingTransform = mat4.create();

        
        await initShader();

        setupBuffers();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

