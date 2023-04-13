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

bililiteRange.sendkeys['{ArrowUp}']


let activeEffect = 'mask';
function onResults(results) {
    console.log("brru");
    // Hide the spinner.
    // document.body.classList.add('loaded');
    // Update the frame rate.
    // fpsControl.tick();
    // Draw the overlays.

    // Process this shet
    if (results.poseLandmarks) {
        left_foot = results.poseLandmarks[mpPose.POSE_LANDMARKS_LEFT.LEFT_ANKLE];
        right_foot = results.poseLandmarks[mpPose.POSE_LANDMARKS_RIGHT.RIGHT_ANKLE];
        left_hip = results.poseLandmarks[mpPose.POSE_LANDMARKS.LEFT_HIP];
        right_hip = results.poseLandmarks[mpPose.POSE_LANDMARKS.RIGHT_HIP];

        // Calculate the distance between the hips landmarks
        current_hip_distance = Math.abs(left_hip.y - right_hip.y) * canvasElement.width;

        if (last_left_foot_y != null && last_right_foot_y != null && left_foot.y < last_left_foot_y - jump_threshold && right_foot.y < last_right_foot_y - jump_threshold && is_jumping == false && is_squating == false) {
            // pyautogui.press('up')
            bililiteRange.sendkeys['{ArrowUp}']
            is_jumping = true
            is_squating = false
            console.log("Jump detected!")
        } else if (
            last_hip_y &&
            (left_hip.y + right_hip.y) - last_hip_y > squat_threshold &&
            last_hip_to_foot_distance - ((left_hip.y + right_hip.y) + (left_foot.y + right_foot.y)) > squat_threshold && is_jumping == false && is_squating == false) {
            // pyautogui.press('down')
            bililiteRange.sendkeys['{ArrowDown}']
            is_jumping = false
            is_squating = true
            console.log("Squat detected!")
        } else {
            is_jumping = false;
            is_squating = false;
        }
        last_left_foot_y = left_foot.y + right_foot.y
        last_right_foot_y = right_foot.y
        last_hip_y = left_hip.y + right_hip.y
        last_hip_to_foot_distance = last_hip_y - Math.max(left_foot.y, right_foot.y)
    }

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

        console.log(results.poseLandmarks);
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
        console.log("yee");
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