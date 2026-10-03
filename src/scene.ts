import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  sampleTrack as trackSample,
  nearestTrack as trackNearest,
  getTrack,
  type GameState,
} from "./game";
import { getLevel, widthAt } from "./levels";

const palette = {
  sand: "#d8c295",
  grass: "#7e9162",
  road: "#465251",
  curb: "#df7558",
  sea: "#438f99",
};
export async function createScene(
  canvas: HTMLCanvasElement,
  onLoad: (s: string) => void,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eac9a6");
  scene.fog = new THREE.Fog("#eac9a6", 140, 460);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader:
        "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec3 v;void main(){float h=max(0.,normalize(v).y);vec3 low=vec3(.92,.75,.56),high=vec3(.39,.64,.69);gl_FragColor=vec4(mix(low,high,pow(h,.65)),1.);}",
    }),
  );
  scene.add(sky);
  scene.add(new THREE.HemisphereLight("#fff0d4", "#668c88", 2.3));
  const sun = new THREE.DirectionalLight("#ffe2b5", 3.1);
  sun.position.set(-95, 110, -80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -160,
    right: 160,
    top: 160,
    bottom: -160,
    near: 1,
    far: 400,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.07;
  scene.add(sun);
  const oceanMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 p;uniform float time;void main(){float a=sin(p.x*.16+p.z*.21+time*.6);float b=sin(p.z*.65-p.x*.12+time);float glint=pow(max(0.,a*b),12.);vec3 c=mix(vec3(.16,.46,.51),vec3(.32,.65,.66),.5+.2*a);c+=glint*.11;gl_FragColor=vec4(c,1.);}`,
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -0.85;
  scene.add(ocean);
  const loader = new GLTFLoader();
  onLoad("Preparando seu carro…");
  const carRoot = new THREE.Group();
  scene.add(carRoot);
  const gltf = await loader.loadAsync("/assets/cars/race.glb");
  const car = gltf.scene;
  const box = new THREE.Box3().setFromObject(car);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  car.position.sub(center);
  car.position.y += size.y / 2;
  const scale = 2.05 / size.x;
  car.scale.setScalar(scale);
  car.position.multiplyScalar(scale);
  car.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  carRoot.add(car);
  // Model's authored direction is adjusted after inspection of its source.
  car.rotation.y = 0;
  onLoad("Plantando a costa…");
  const treeGLTF = await loader.loadAsync(
    "/assets/nature/tree_palmDetailedTall.glb",
  );
  treeGLTF.scene.updateMatrixWorld(true);
  const treeMeshes: THREE.Mesh[] = [];
  treeGLTF.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      if (o.material instanceof THREE.MeshStandardMaterial)
        o.material.metalness = 0;
      treeMeshes.push(o);
    }
  });
  const rockGLTF = await loader.loadAsync("/assets/nature/rock_largeA.glb");
  rockGLTF.scene.traverse((o) => {
    if (
      o instanceof THREE.Mesh &&
      o.material instanceof THREE.MeshStandardMaterial
    )
      o.material.metalness = 0;
  });
  const warningCanvas = document.createElement("canvas");
  warningCanvas.width = warningCanvas.height = 128;
  const context = warningCanvas.getContext("2d")!;
  context.beginPath();
  context.moveTo(64, 7);
  context.lineTo(120, 115);
  context.lineTo(8, 115);
  context.closePath();
  context.fillStyle = "#ebc36e";
  context.fill();
  context.lineWidth = 7;
  context.strokeStyle = "#425154";
  context.stroke();
  context.fillStyle = "#425154";
  context.font = "bold 76px Arial";
  context.textAlign = "center";
  context.fillText("!", 64, 105);
  const warningTexture = new THREE.CanvasTexture(warningCanvas);
  warningTexture.colorSpace = THREE.SRGBColorSpace;
  const warningMaterial = new THREE.MeshStandardMaterial({
    map: warningTexture,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  function buildLevel(levelId: number) {
    const level = getLevel(levelId),
      half = level.roadWidth / 2;
    const root = new THREE.Group();
    const sampleTrack = (t: number) => trackSample(t, levelId);
    const nearestTrack = (x: number, z: number) => trackNearest(x, z, levelId);
    const CHECKPOINTS = getTrack(levelId).checkpoints;
    const groundGeo = new THREE.PlaneGeometry(310, 380, 64, 80);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      const edge = Math.sqrt((x / 146) ** 2 + (z / 180) ** 2);
      let h = edge > 1 ? -2 : Math.max(-0.25, (1 - edge) * 1.5);
      if (edge < 0.55) h += Math.sin(x * 0.035) * Math.cos(z * 0.032) * 4;
      pos.setY(i, nearestTrack(x, z).distance < 13 ? -0.08 : h - 0.35);
      const c = new THREE.Color(edge > 0.78 ? palette.sand : palette.grass);
      c.multiplyScalar(0.93 + 0.07 * Math.sin(x * 0.34 + z * 0.19));
      colors.push(c.r, c.g, c.b);
    }
    groundGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    groundGeo.computeVertexNormals();
    const land = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    land.receiveShadow = true;
    root.add(land);
    function strip(
      inner: number,
      outer: number,
      y: number,
      mat: THREE.Material,
      sections = 720,
    ) {
      const vertices: number[] = [],
        uv: number[] = [],
        indices: number[] = [];
      for (let i = 0; i <= sections; i++) {
        const p = sampleTrack(i / sections);
        for (const d of [inner, outer]) {
          vertices.push(
            p.x + (p.nx * d * widthAt(p.t, levelId)) / level.roadWidth,
            y,
            p.z + (p.nz * d * widthAt(p.t, levelId)) / level.roadWidth,
          );
          uv.push(d, i / sections);
        }
        if (i < sections) {
          let a = i * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = true;
      root.add(m);
      return m;
    }
    strip(
      -half - 2.5,
      half + 2.5,
      0.09,
      new THREE.MeshStandardMaterial({ color: "#c6b48f", roughness: 1 }),
    );
    strip(
      -half,
      half,
      0.12,
      new THREE.MeshStandardMaterial({ color: palette.road, roughness: 0.94 }),
    );
    const dummy = new THREE.Object3D();
    for (const side of [-1, 1]) {
      strip(
        side * (half - 0.45),
        side * (half - 0.3),
        0.135,
        new THREE.MeshStandardMaterial({
          color: "#f0e4ca",
          side: THREE.DoubleSide,
        }),
      );
      const vertices: number[] = [],
        colors: number[] = [];
      for (let i = 0; i < 360; i++) {
        const a = sampleTrack(i / 360),
          b = sampleTrack((i + 1) / 360),
          color = new THREE.Color(
            Math.floor(i / 2) % 2 ? level.accent : "#f6e7ce",
          );
        const corners = [
          [a, widthAt(a.t, levelId) / 2],
          [b, widthAt(b.t, levelId) / 2],
          [a, widthAt(a.t, levelId) / 2 + 0.65],
          [a, widthAt(a.t, levelId) / 2 + 0.65],
          [b, widthAt(b.t, levelId) / 2],
          [b, widthAt(b.t, levelId) / 2 + 0.65],
        ] as const;
        for (const [p, d] of corners) {
          vertices.push(p.x + p.nx * d * side, 0.17, p.z + p.nz * d * side);
          colors.push(color.r, color.g, color.b);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      g.computeVertexNormals();
      const curbs = new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 1,
        }),
      );
      curbs.receiveShadow = true;
      root.add(curbs);
    }
    const dashes = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.12, 2.1),
      new THREE.MeshStandardMaterial({ color: "#e5d6ac" }),
      100,
    );
    for (let j = 0; j < 100; j++) {
      const p = sampleTrack(j / 100);
      dummy.rotation.set(-Math.PI / 2, 0, p.heading);
      dummy.position.set(p.x, 0.14, p.z);
      dummy.updateMatrix();
      dashes.setMatrixAt(j, dummy.matrix);
    }
    root.add(dashes);
    const start = sampleTrack(0);
    for (let x = -Math.floor(half); x < Math.floor(half); x++)
      for (let z = 0; z < 3; z++) {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshStandardMaterial({
            color: (x + z) % 2 ? "#f5ebd6" : "#253d3f",
          }),
        );
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = start.heading;
        m.position.set(
          start.x + start.nx * (x + 0.5) + start.tx * (z - 1),
          0.15,
          start.z + start.nz * (x + 0.5) + start.tz * (z - 1),
        );
        root.add(m);
      }
    const gates: THREE.Group[] = [];
    CHECKPOINTS.forEach((p, i) => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.2, p.z);
      group.rotation.y = p.heading;
      const mat = new THREE.MeshStandardMaterial({
        color: "#e5bc73",
        emissive: "#d59440",
        emissiveIntensity: 0.18,
      });
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 3.7, 8),
          mat,
        );
        post.position.set(side * (half - 0.8), 1.85, 0);
        group.add(post);
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1.2),
          new THREE.MeshStandardMaterial({
            color: i === 7 ? "#f4e3c4" : "#de7958",
            side: THREE.DoubleSide,
          }),
        );
        flag.position.set(side * (half - 1.35), 3, 0);
        group.add(flag);
      }
      root.add(group);
      gates.push(group);
    });
    // A composed coastal landscape: distant headlands, rocks and a little harbor.
    const rockMat = new THREE.MeshStandardMaterial({
      color: "#a39c85",
      roughness: 1,
      flatShading: true,
    });
    for (let i = 0; i < 34; i++) {
      const a = i * 2.399,
        r = 110 + Math.sin(i * 7) * 12;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), rockMat);
      rock.position.set(Math.sin(a) * r, -0.1, Math.cos(a) * r * 1.28);
      rock.scale.set(3 + (i % 4), 2 + (i % 3), 2 + (i % 5));
      rock.rotation.set(i, i * 0.8, 0);
      rock.castShadow = true;
      root.add(rock);
    }
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 12),
        new THREE.MeshStandardMaterial({ color: "#889d8b", roughness: 1 }),
      );
      m.position.set(-240 - i * 28, -10, -180 + i * 34);
      m.scale.set(55, 20 + i * 3, 70);
      root.add(m);
    }
    for (const mesh of treeMeshes) {
      const batch = new THREE.InstancedMesh(mesh.geometry, mesh.material, 72);
      for (let i = 0; i < 72; i++) {
        const t = (i * 0.618033) % 1,
          p = sampleTrack(t),
          side = i % 3 === 0 ? 1 : -1,
          d = 11 + (i % 7) * 2.6;
        dummy.position.set(p.x + p.nx * d, 0.1, p.z + p.nz * d);
        dummy.scale.setScalar(5 + (i % 4) * 0.6);
        dummy.rotation.set(0, i * 1.77, 0);
        dummy.updateMatrix();
        batch.setMatrixAt(
          i,
          new THREE.Matrix4().multiplyMatrices(dummy.matrix, mesh.matrixWorld),
        );
      }
      batch.castShadow = true;
      batch.receiveShadow = true;
      root.add(batch);
    }

    for (const obstacle of getTrack(levelId).obstacles) {
      const rock = rockGLTF.scene.clone(true);
      const box = new THREE.Box3().setFromObject(rock);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const k = (obstacle.radius * 2) / Math.max(size.x, size.z);
      rock.position.sub(center);
      rock.position.y += size.y / 2;
      rock.scale.set(k, k * 1.8, k);
      rock.position.multiplyScalar(k);
      rock.position.y *= 1.8;
      const holder = new THREE.Group();
      holder.position.set(obstacle.x, 0.17, obstacle.z);
      holder.rotation.y = obstacle.index * 1.4;
      holder.add(rock);
      root.add(holder);
      rock.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      const p = sampleTrack(obstacle.t - 0.013);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: "#efe5cb" }),
      );
      pole.position.set(
        p.x + p.nx * (half + 0.9),
        1.2,
        p.z + p.nz * (half + 0.9),
      );
      root.add(pole);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4),
        warningMaterial,
      );
      sign.position.copy(pole.position);
      sign.position.y = 2.2;
      sign.rotation.y = p.heading;
      root.add(sign);
    }
    for (const [from, to] of level.sand) {
      const vertices: number[] = [];
      for (let j = 0; j < 40; j++) {
        const a = sampleTrack(from + ((to - from) * j) / 40),
          b = sampleTrack(from + ((to - from) * (j + 1)) / 40);
        for (const [p, side] of [
          [a, -1],
          [b, -1],
          [a, 1],
          [a, 1],
          [b, -1],
          [b, 1],
        ] as const) {
          const d = widthAt(p.t, levelId) / 2 - 0.2;
          vertices.push(p.x + p.nx * d * side, 0.155, p.z + p.nz * d * side);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geometry.computeVertexNormals();
      const sand = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: "#cfb27b",
          roughness: 1,
          transparent: true,
          opacity: 0.87,
          side: THREE.DoubleSide,
        }),
      );
      sand.receiveShadow = true;
      root.add(sand);
    }
    if (levelId === 2) {
      // Stone parapets signal the narrower causeway. No decorative collision mismatch.
      const railMat = new THREE.MeshStandardMaterial({
        color: "#e0d1ac",
        roughness: 1,
      });
      for (const side of [-1, 1])
        for (let i = 0; i < 32; i++) {
          const p = sampleTrack(0.402 + (i * 0.085) / 32);
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.65, 1.9),
            railMat,
          );
          rail.position.set(
            p.x + p.nx * 3.65 * side,
            0.45,
            p.z + p.nz * 3.65 * side,
          );
          rail.rotation.y = p.heading;
          rail.castShadow = true;
          root.add(rail);
        }
      const lighthouse = new THREE.Group();
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 3.4, 19, 24),
        new THREE.MeshStandardMaterial({ color: "#f2e6ca", roughness: 0.8 }),
      );
      tower.position.y = 9.5;
      lighthouse.add(tower);
      for (const y of [6, 13]) {
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(
            y === 6 ? 2.97 : 2.49,
            y === 6 ? 3.05 : 2.57,
            1.3,
            24,
          ),
          new THREE.MeshStandardMaterial({ color: "#bd6148" }),
        );
        band.position.y = y;
        lighthouse.add(band);
      }
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.4, 2.3, 12),
        new THREE.MeshStandardMaterial({
          color: "#426c73",
          metalness: 0.25,
          roughness: 0.3,
        }),
      );
      lantern.position.y = 20;
      lighthouse.add(lantern);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 2, 24), railMat);
      roof.position.y = 22;
      lighthouse.add(roof);
      lighthouse.position.set(42, 0, 82);
      lighthouse.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
      root.add(lighthouse);
    }
    scene.add(root);
    return { root, gates };
  }
  const trackScenes = new Map<number, ReturnType<typeof buildLevel>>();
  let currentLevel = -1;
  let gates: THREE.Group[] = [];
  function selectLevel(id: number) {
    if (currentLevel === id) return;
    let entry = trackScenes.get(id);
    if (!entry) {
      entry = buildLevel(id);
      trackScenes.set(id, entry);
    }
    for (const [key, value] of trackScenes) value.root.visible = key === id;
    gates = entry.gates;
    currentLevel = id;
    initialized = false;
  }
  const wheels: THREE.Object3D[] = [];
  car.traverse((o) => {
    if (o.name.startsWith("wheel-")) wheels.push(o);
  });
  const cameraTarget = new THREE.Vector3();
  let initialized = false;
  const resize = () => {
    const w = innerWidth,
      h = innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  return {
    renderer,
    scene,
    camera,
    carRoot,
    render(state: GameState, dt: number, time: number) {
      selectLevel(state.levelId);
      oceanMat.uniforms.time.value = time;
      for (const wheel of wheels) wheel.rotation.x += (state.speed * dt) / 0.34;
      carRoot.position.set(state.x, 0.2, state.z);
      carRoot.rotation.y = state.heading;
      carRoot.rotation.z =
        Math.sin(time * 15) * Math.min(0.008, state.speed * 0.0002);
      gates.forEach((g, i) => (g.visible = i >= state.checkpointsPassed));
      const menu = state.phase === "menu";
      const portrait = innerWidth < innerHeight;
      const forward = new THREE.Vector3(
        Math.sin(state.heading),
        0,
        Math.cos(state.heading),
      );
      const desired = menu
        ? new THREE.Vector3(state.x - 12, 7.5, state.z - 14)
        : new THREE.Vector3(state.x, 0, state.z)
            .addScaledVector(
              forward,
              -(portrait ? 17 : 11.5) - Math.abs(state.speed) * 0.055,
            )
            .add(new THREE.Vector3(0, portrait ? 9 : 6.4, 0));
      const target = menu
        ? new THREE.Vector3(state.x + (portrait ? 0 : 5), 1.1, state.z)
        : new THREE.Vector3(state.x, 1.1, state.z).addScaledVector(forward, 7);
      if (!initialized) {
        camera.position.copy(desired);
        cameraTarget.copy(target);
        initialized = true;
      }
      camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
      cameraTarget.lerp(target, 1 - Math.exp(-dt * 7));
      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
    },
  };
}
