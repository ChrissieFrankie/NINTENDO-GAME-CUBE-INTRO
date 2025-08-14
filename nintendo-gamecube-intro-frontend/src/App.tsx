import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GameCubeStartup() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 6, 5);
    camera.lookAt(0, -2, 0);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 10, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-5, 10, -5);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight3.position.set(0, -5, 0);
    scene.add(dirLight3);

    // --- Large cube ---
    const largeCubeSize = 3;
    const largeCubeGeometry = new THREE.BoxGeometry(
      largeCubeSize,
      largeCubeSize,
      largeCubeSize
    );
    const largeCubeMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.5,
    });
    const largeCube = new THREE.Mesh(largeCubeGeometry, largeCubeMaterial);
    largeCube.position.set(0, -largeCubeSize / 2, 0);
    scene.add(largeCube);

    // --- Small cube ---
    const cubeSize = 1;
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshPhongMaterial({
      color: 0x5e4ba4,
      shininess: 200,
      specular: 0xcccccc,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 8, -largeCubeSize / 3);
    scene.add(cube);

    // --- Falling animation ---
    let time = 0;
    const fallDuration = 1.5;
    const startY = 8;
    const targetY = cubeSize / 2;
    let landed = false;

    function easeOutBounce(t: number) {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }

    // --- Easing for roll ---
    function easeOutQuad(t: number) {
      return 1 - (1 - t) * (1 - t);
    }

    // --- Rolling state ---
    let rolling: { angle?: any; dx?: any; dz?: any; } | null = null;
    const rollSpeed = Math.PI / 20;
    let cubeX = 0;
    let cubeZ = -largeCubeSize / 3;
    const maxAngle = Math.PI / 2; // Removed overshoot to reduce glitches

    function rollCube(dx: number, dz: number) {
      if (!landed || rolling) return;
      // Boundary check to stay on large cube
      const newX = cubeX + dx * cubeSize;
      const newZ = cubeZ + dz * cubeSize;
      if (
        Math.abs(newX) > largeCubeSize / 2 - cubeSize / 2 ||
        Math.abs(newZ) > largeCubeSize / 2 - cubeSize / 2
      ) {
        return; // Prevent rolling off the large cube
      }
      rolling = { dx, dz, angle: 0 };
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "w") rollCube(0, -1);
      if (e.key === "s") rollCube(0, 1);
      if (e.key === "a") rollCube(-1, 0);
      if (e.key === "d") rollCube(1, 0);
    });

    // --- Animate ---
    function animate() {
      requestAnimationFrame(animate);

      // Falling
      if (!landed) {
        time += 1 / 60;
        if (time < fallDuration) {
          const progress = time / fallDuration;
          const eased = easeOutBounce(progress);
          cube.position.y = startY - (startY - targetY) * eased;
          cube.rotation.x = Math.sin(time * 3) * 0.05;
          cube.rotation.z = Math.cos(time * 2) * 0.05;
        } else {
          cube.position.y = targetY;
          cube.rotation.set(0, 0, 0);
          landed = true;
        }
      }

      // Rolling
      if (rolling) {
        const { dx, dz } = rolling;
        rolling.angle += rollSpeed;
        let theta = Math.min(rolling.angle, maxAngle);
        const progress = theta / maxAngle;
        theta *= easeOutQuad(progress); // Apply easing for smooth roll

        // Calculate position during roll
        const pivotOffset = cubeSize / 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        const offsetX = dx * pivotOffset * (1 - cosTheta);
        const offsetY = pivotOffset * sinTheta;
        const offsetZ = dz * pivotOffset * (1 - cosTheta);

        cube.position.set(
          cubeX + offsetX,
          targetY + offsetY,
          cubeZ + offsetZ
        );

        // Apply rotation
        if (dx !== 0) {
          cube.rotation.z = -theta * dx;
        } else if (dz !== 0) {
          cube.rotation.x = theta * dz;
        }

        if (rolling.angle >= maxAngle) {
          // Snap to grid
          cubeX += dx * cubeSize;
          cubeZ += dz * cubeSize;
          cube.position.set(cubeX, targetY, cubeZ);
          cube.rotation.set(0, 0, 0);
          rolling = null;
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    // --- Handle resize ---
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      largeCubeGeometry.dispose();
      largeCubeMaterial.dispose();
      if (mountRef.current && mountRef.current.firstChild) {
        mountRef.current.removeChild(mountRef.current.firstChild);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    />
  );
}