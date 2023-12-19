let arrowLeft = {
    "key": "ArrowLeft",
    "code": "ArrowLeft",
    "keyCode": 37,
    "which": 37,
    "bubbles": true,
};

let arrowRight = {
    "key": "ArrowRight",
    "code": "ArrowRight",
    "keyCode": 39,
    "which": 39,
    "bubbles": true,
};

let arrowUp = {
    "key": "ArrowUp",
    "code": "ArrowUp",
    "keyCode": 38,
    "which": 38,
    "bubbles": true,
};

let arrowDown = {
    "key": "ArrowDown",
    "code": "ArrowDown",
    "keyCode": 40,
    "which": 40,
    "bubbles": true,
};

lastSide = Date.now();
timeDelay = 600;

function userInput(direction) {
    let dir = null;
    switch (direction) {
        case "left":
            if (Date.now() - lastSide > timeDelay) {
                dir = arrowLeft;
                lastSide = Date.now();
            }
            break;
        case "right":
            if (Date.now() - lastSide > timeDelay) {
                dir = arrowRight;
                lastSide = Date.now();
            }
            break;
        case "up": dir = arrowUp; break;
        case "down": dir = arrowDown; break;
    }
    if (dir != null) {
        console.log("key PRESS" + direction)
        document.dispatchEvent(new KeyboardEvent('keydown', dir));
        document.dispatchEvent(new KeyboardEvent('keyup', dir));
        document.getElementById("text_box").textContent = direction + " " + Date.now();
        console.log('Done');
    }
}

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const controls = window;
const drawingUtils = window;
const mpPose = window;
const options = {
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}/${file}`;
    }
};

console.log(mpPose.VERSION);


// Initialize variables to keep track of previous positions and distances
sensitivity = 1
jump_threshold = 0.05 * canvasElement.height * sensitivity
squat_threshold = 0.25 * canvasElement.height * sensitivity

last_hip_y = null
last_left_foot_y = null
last_right_foot_y = null
is_jumping = false
is_squating = false
last_hip_to_foot_distance = null


let activeEffect = 'mask';


function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

console.log('wait!');

waitForElm('#game').then((elm) => {
    console.log('Element is ready');
    // elm.style.width = "59%";
    // elm.style.height = "60%";
    elm.style.margin = 0;
    elm.style.padding = 0;
    elm.style.overflow = "hidden";
    // elm.style.z-index = 999999;
    elm.style.zIndex="0";
    elm.style.display = "block";
    elm.style.margin = "0 auto";
    // elm.style.opacity = "0.5";
});

// Declaration
class movingAverage {
    constructor(length) {
        this.length = length;
        this.array = [];
        this.sum = 0;
    }

    add(value) {
        this.array.push(value);
        this.sum += value;
        if (this.array.length > this.length) {
            this.sum -= this.array.shift();
        }
    }

    getAverage() {
        return this.sum / this.array.length;
    }
}

const avg_height_difference = new movingAverage(10);

function isSquat(landmarks) {
    left_ankle = landmarks[mpPose.POSE_LANDMARKS_LEFT.LEFT_ANKLE]
    right_ankle = landmarks[mpPose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]
    left_hip = landmarks[mpPose.POSE_LANDMARKS.LEFT_HIP]
    right_hip = landmarks[mpPose.POSE_LANDMARKS.RIGHT_HIP]

    // Calculate the average height of ankles
    ankle_height = (left_ankle.y + right_ankle.y) / 2

    avg_hip_height = (left_hip.y + right_hip.y) / 2

    // Calculate the difference in height between ankles and hip
    height_difference = ankle_height - avg_hip_height
    avg_height_difference.add(height_difference);

    change = 1.0 - (height_difference / avg_height_difference.getAverage());
    // document.getElementById("text_box_1").textContent = change;
    // Set a threshold for jump detection
    squat_threshold = 0.08  // Adjust this value based on your scenario

    // document.getElementById("text_box_1").textContent = height_difference;
    // Check if the height difference is above the threshold
    return change - squat_threshold
}

const avg_ankle_height = new movingAverage(10);

function isJump(landmarks) {
    // Extract relevant landmarks
    left_ankle = landmarks[mpPose.POSE_LANDMARKS_LEFT.LEFT_ANKLE]
    right_ankle = landmarks[mpPose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]
    left_knee = landmarks[mpPose.POSE_LANDMARKS_LEFT.LEFT_KNEE]
    right_knee = landmarks[mpPose.POSE_LANDMARKS_RIGHT.RIGHT_KNEE]
    left_hip = landmarks[mpPose.POSE_LANDMARKS.LEFT_HIP]
    right_hip = landmarks[mpPose.POSE_LANDMARKS.RIGHT_HIP]

    // Calculate the average height of ankles
    ankle_height = (left_ankle.y + right_ankle.y) / 2.0
    avg_ankle_height.add(ankle_height);

    // Set a threshold for squat detection
    change = 1.0 - (ankle_height / avg_ankle_height.getAverage());
    jump_threshold = 0.02  // Adjust this value based on your scenario
    // document.getElementById("text_box_1").textContent = change;
    // Check if knees are lower than hips (squat position)
    return change - jump_threshold
}

const avg_ankle_point = new movingAverage(10);

function isSide(landmarks) {
    left_ankle = landmarks[mpPose.POSE_LANDMARKS_LEFT.LEFT_ANKLE]
    right_ankle = landmarks[mpPose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE]
    left_knee = landmarks[mpPose.POSE_LANDMARKS_LEFT.LEFT_KNEE]
    right_knee = landmarks[mpPose.POSE_LANDMARKS_RIGHT.RIGHT_KNEE]
    left_hip = landmarks[mpPose.POSE_LANDMARKS.LEFT_HIP]
    right_hip = landmarks[mpPose.POSE_LANDMARKS.RIGHT_HIP]

    // Calculate the average distance of ankles
    ankle_point = (left_ankle.x + right_ankle.x) / 2
    avg_ankle_point.add(ankle_point);

    dampener = 1; // why would I want to diminish the signal?

    total = (1.0 - (ankle_point / avg_ankle_point.getAverage())) * dampener;
    // document.getElementById("text_box_1").textContent = total;
    // avgSide.add(total);
    return total;
}

ankle_threshold = 0.01;
// const avgSide = new movingAverage(10); 
// side movements can be spammed unlock up and down, they need to be slowed down
// actually I've decided to cheat for now: you will never bump into the side walls

function isLeft(landmarks) {
    return isSide(landmarks) - ankle_threshold;
}

function isRight(landmarks) {
    return -isSide(landmarks) - ankle_threshold;
}

function findMaximumElementIndex(arr) {
    let maxIndex = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > arr[maxIndex]) {
            maxIndex = i;
        }
    }
    console.log(maxIndex + " b " + arr[maxIndex])
    return maxIndex;
}

// userInput("down")
var previous_result;
function onResults(results) {
    // console.log("brru");
    // Hide the spinner.
    // document.body.classList.add('loaded');
    // Update the frame rate.
    // fpsControl.tick();
    // Draw the overlays.

    // Process this shet
    if (results.poseLandmarks && previous_result) {
        // Calculate the distance between the hips landmarks
        // current_hip_distance = Math.abs(left_hip.y - right_hip.y) * canvasElement.width;

        // place moves in array
        // TODO: rank res by threshold percentage
        let arr = [isJump(results.poseLandmarks), isSquat(results.poseLandmarks), isLeft(results.poseLandmarks), isRight(results.poseLandmarks)];
        let maxIndex = findMaximumElementIndex(arr);
        console.log(arr);
        console.log(maxIndex);
        document.getElementById("text_box_1").textContent = arr[maxIndex];
        if (arr[maxIndex] > 0) {
            switch (maxIndex) {
                case 0: userInput("up"); break;
                case 1: userInput("down"); break;
                case 2: userInput("left"); break;
                case 3: userInput("right"); break;
            }
        }
    }
    previous_result = results;

    // make this part async
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (results.segmentationMask) {
        canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
        // Only overwrite existing pixels.
        if (activeEffect === 'mask' || activeEffect === 'both') {
            canvasCtx.globalCompositeOperation = 'source-in';
            // This can be a color or a texture or whatever...
            canvasCtx.fillStyle = '#00FF007F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        else {
            canvasCtx.globalCompositeOperation = 'source-out';
            canvasCtx.fillStyle = '#0000FF7F';
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = 'destination-atop';
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-over';
    }
    else {
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }
    if (results.poseLandmarks) {
        drawingUtils.drawConnectors(canvasCtx, results.poseLandmarks, mpPose.POSE_CONNECTIONS, { visibilityMin: 0.65, color: 'white' });
        drawingUtils.drawLandmarks(canvasCtx, Object.values(mpPose.POSE_LANDMARKS_LEFT)
            .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)' });
        drawingUtils.drawLandmarks(canvasCtx, Object.values(mpPose.POSE_LANDMARKS_RIGHT)
            .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)' });
        drawingUtils.drawLandmarks(canvasCtx, Object.values(mpPose.POSE_LANDMARKS_NEUTRAL)
            .map(index => results.poseLandmarks[index]), { visibilityMin: 0.65, color: 'white', fillColor: 'white' });

        // console.log(results.poseLandmarks);
    }
    canvasCtx.restore();
    // if (results.poseWorldLandmarks) {
    //     grid.updateLandmarks(results.poseWorldLandmarks, mpPose.POSE_CONNECTIONS, [
    //         { list: Object.values(mpPose.POSE_LANDMARKS_LEFT), color: 'LEFT' },
    //         { list: Object.values(mpPose.POSE_LANDMARKS_RIGHT), color: 'RIGHT' },
    //     ]);
    // }
    // else {
    //     grid.updateLandmarks([]);
    // }
}
const pose = new mpPose.Pose(options);
pose.initialize();
pose.setOptions({
    modelComplexity: 1,
    selfieMode: true,
    //     selfieMode: true,
    //     modelComplexity: 1,
    //     smoothLandmarks: true,
    //     enableSegmentation: false,
    //     smoothSegmentation: true,
    //     minDetectionConfidence: 0.5,
    //     minTrackingConfidence: 0.5,
    //     effect: 'background',
    // upperBodyOnly: false,
    // smoothLandmarks: true,
    // minDetectionConfidence: 0.5,
    // minTrackingConfidence: 0.5
});
pose.onResults(onResults);
pose.reset();

// Start capturing video from the webcam
const camera = new Camera(videoElement, {
    onFrame: async () => {
        // Flip the frame horizontally for a mirrored view
        // canvasCtx.translate(canvasElement.width, 0);
        // canvasCtx.scale(-1, 1);
        // canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        // canvasCtx.setTransform(1, 0, 0, 1, 0, 0);

        // Get the pose landmarks from the frame
        // const poses = await pose.estimatePoses(canvasElement);
        // console.log("yee");
        await pose.send({ image: videoElement });

        // Check if the person is jumping
        // if (poses.length > 0) {
        //   const leftKnee = poses[0].keypoints.find((keypoint) => keypoint.name === 'left_knee');
        //   const rightKnee = poses[0].keypoints.find((keypoint) => keypoint.name === 'right_knee');
        //   const leftHip = poses[0].keypoints.find((keypoint) => keypoint.name === 'left_hip');
        //   const rightHip = poses[0].keypoints.find((keypoint) => keypoint.name === 'right_hip');

        //   if (leftKnee.score > 0.5 && rightKnee.score > 0.5 && leftHip.score > 0.5 && rightHip.score > 0.5) {
        //     const kneeDist = Math.abs(leftKnee.y - rightKnee.y);
        //     const hipDist = Math.abs(leftHip.y - rightHip.y);
        //     if (kneeDist > 0.6 * hipDist) {
        //       console.log('Jump detected!');
        //     }
        //   }
        // }
    },
    width: canvasElement.width,
    height: canvasElement.height
});
camera.start();