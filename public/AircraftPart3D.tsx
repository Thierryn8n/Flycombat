import { useRef, useState, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { AircraftPart } from "@/data/aircraftDatabase";

interface AircraftPart3DProps {
  part: AircraftPart & { uid: string };
  isSelected: boolean;
  onSelect: (uid: string, multi: boolean) => void;
}

function createWingShape(w: number, d: number): THREE.Shape {
  const shape = new THREE.Shape();
  // Swept wing shape: wide at root, tapered at tip
  shape.moveTo(0, 0);
  shape.lineTo(w * 0.3, d * 0.5);    // leading edge sweep
  shape.lineTo(w, d * 0.35);          // tip leading
  shape.lineTo(w * 0.95, d * 0.15);   // tip trailing
  shape.lineTo(w * 0.15, -d * 0.5);   // trailing edge
  shape.lineTo(0, -d * 0.45);         // root trailing
  shape.closePath();
  return shape;
}

function createFuselageShape(w: number, h: number): THREE.Shape {
  const shape = new THREE.Shape();
  // Rounded rectangle cross-section
  const r = Math.min(h, w) * 0.35;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return shape;
}

function createTailVShape(w: number, h: number): THREE.Shape {
  const shape = new THREE.Shape();
  // Vertical stabilizer: swept trapezoid
  shape.moveTo(0, 0);
  shape.lineTo(w * 0.4, h);    // tip leading (swept)
  shape.lineTo(w * 0.8, h);    // tip trailing
  shape.lineTo(w, 0);          // root trailing
  shape.closePath();
  return shape;
}

export default function AircraftPart3D({ part, isSelected, onSelect }: AircraftPart3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const centerX = part.x + part.w / 2;
  const centerY = part.y + part.h / 2;
  const centerZ = part.z + part.d / 2;
  const rotX = part.rotationX ? THREE.MathUtils.degToRad(part.rotationX) : 0;
  const rotY = part.rotationY ? THREE.MathUtils.degToRad(part.rotationY) : 0;
  const rotZ = part.rotationZ ? THREE.MathUtils.degToRad(part.rotationZ) : 0;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(part.uid, e.shiftKey);
  };

  const opacity = part.opacity ?? 1;
  const isTransparent = opacity < 1 || part.type === "canopy" || part.type === "cockpit";

  const materialColor = isSelected ? "#2563eb" : hovered ? "#60a5fa" : part.color;
  const emissiveColor = isSelected ? "#2563eb" : hovered ? "#1e40af" : "#000000";
  const emissiveIntensity = isSelected ? 0.15 : hovered ? 0.05 : 0;

  const materialProps = {
    color: materialColor,
    transparent: isTransparent || isSelected || hovered,
    opacity: isSelected ? 0.85 : isTransparent ? (hovered ? 0.7 : opacity) : 1,
    metalness: 0.4,
    roughness: 0.5,
    emissive: emissiveColor,
    emissiveIntensity,
    flatShading: false,
  };

  // Build geometry based on part type — ALL centered at origin
  const geometry = useMemo(() => {
    const type = part.type;
    const { w, h, d } = part;

    if (type === "fuselage") {
      const shape = createFuselageShape(d, h);
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: w,
        bevelEnabled: true,
        bevelThickness: Math.min(h, d) * 0.15,
        bevelSize: Math.min(h, d) * 0.12,
        bevelSegments: 6,
      });
      geo.rotateY(Math.PI / 2);
      geo.center();
      return geo;
    }

    if (["wing", "leading_edge", "flap", "aileron", "lerx", "canard", "tail_h"].includes(type)) {
      const shape = createWingShape(w, d);
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: h,
        bevelEnabled: true,
        bevelThickness: h * 0.3,
        bevelSize: Math.min(w, d) * 0.02,
        bevelSegments: 3,
      });
      geo.rotateX(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "tail_v") {
      const shape = createTailVShape(w, h);
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1, depth: d,
        bevelEnabled: true,
        bevelThickness: d * 0.2,
        bevelSize: d * 0.1,
        bevelSegments: 3,
      });
      geo.center();
      return geo;
    }

    if (type === "nose" || type === "nose_tip") {
      const geo = new THREE.ConeGeometry(Math.max(h, d) / 2, w, 12);
      geo.rotateZ(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "engine" || type === "afterburner" || type === "nozzle") {
      const rTop = type === "nozzle" ? Math.max(h, d) * 0.35 : Math.max(h, d) * 0.45;
      const rBot = Math.max(h, d) * 0.5;
      const geo = new THREE.CylinderGeometry(rTop, rBot, w, 16);
      geo.rotateZ(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "canopy" || type === "cockpit" || type === "hud") {
      const maxDim = Math.max(w, h, d);
      const geo = new THREE.SphereGeometry(maxDim / 2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      geo.scale(w / maxDim, h / maxDim, d / maxDim);
      geo.center();
      return geo;
    }

    if (type === "intake" || type === "ramp") {
      const shape = new THREE.Shape();
      shape.moveTo(0, -h / 2);
      shape.lineTo(0, h / 2);
      shape.lineTo(d * 0.8, h * 0.3);
      shape.lineTo(d * 0.8, -h * 0.3);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: w, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
      geo.rotateY(Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "missile") {
      const radius = Math.max(h, d) / 2;
      const bodyLen = w * 0.75;
      const tipLen = w * 0.25;
      const points: THREE.Vector2[] = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(radius * 0.3, tipLen * 0.3),
        new THREE.Vector2(radius, tipLen),
        new THREE.Vector2(radius, tipLen + bodyLen * 0.9),
        new THREE.Vector2(radius * 1.15, tipLen + bodyLen),
        new THREE.Vector2(0, tipLen + bodyLen),
      ];
      const geo = new THREE.LatheGeometry(points, 8);
      geo.rotateZ(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "fuel_tank") {
      const radius = Math.max(h, d) / 2;
      const geo = new THREE.CapsuleGeometry(radius, Math.max(0.01, w - radius * 2), 8, 12);
      geo.rotateZ(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "landing_gear") {
      const strutR = Math.min(w, d) * 0.1;
      const geo = new THREE.CylinderGeometry(strutR, strutR * 1.3, h, 8);
      geo.center();
      return geo;
    }

    if (type === "pylon") {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w * 0.8, -h);
      shape.lineTo(w * 0.2, -h);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: d * 0.3, bevelEnabled: false });
      geo.center();
      return geo;
    }

    if (type === "weapon_bay") {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.center();
      return geo;
    }

    if (type === "cannon" || type === "pitot") {
      const radius = Math.max(h, d) * 0.3;
      const geo = new THREE.CylinderGeometry(radius, radius, w, 8);
      geo.rotateZ(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "radar") {
      const radius = Math.max(h, d) / 2;
      const geo = new THREE.CylinderGeometry(radius, radius, w * 0.3, 16);
      geo.rotateZ(-Math.PI / 2);
      geo.center();
      return geo;
    }

    if (type === "seat") {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.center();
      return geo;
    }

    // Default
    const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
    geo.center();
    return geo;
  }, [part.type, part.w, part.h, part.d]);

  // Edge geometry for selection highlight
  const edgeGeo = useMemo(() => {
    return new THREE.EdgesGeometry(geometry);
  }, [geometry]);

  // Uniform positioning: all geometries centered at origin, place at center of bounding box
  const finalX = centerX;
  const finalY = centerY;
  const finalZ = centerZ;

  return (
    <group
      position={[finalX, finalY, finalZ]}
      rotation={[rotX, rotY, rotZ]}
    >
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial {...materialProps} />
      </mesh>
      {(isSelected || hovered) && (
        <lineSegments geometry={edgeGeo}>
          <lineBasicMaterial color={isSelected ? "#3b82f6" : "#94a3b8"} linewidth={1} />
        </lineSegments>
      )}
    </group>
  );
}
