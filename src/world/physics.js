// Axis-separated AABB vs voxel-grid collision.
import { T } from './world.js';

const EPS = 0.001;

/**
 * body: { x, y, z (feet center), vx, vy, vz, hw, hd, h }
 * Moves the body through the grid of `era`. Sets body.onGround / hitWall flags.
 */
export function moveBody(world, era, body, dt) {
  const maxD = Math.max(Math.abs(body.vx), Math.abs(body.vy), Math.abs(body.vz)) * dt;
  const steps = Math.max(1, Math.ceil(maxD / 0.3));
  const sdt = dt / steps;
  const grounded = body.onGround && body.vy <= 0.01;
  body.stepped = 0;
  body.onGround = false;
  body.hitX = false;
  body.hitZ = false;
  body.hitCeil = false;
  for (let s = 0; s < steps; s++) {
    // X
    let d = body.vx * sdt;
    if (d) {
      body.x += d;
      if (hits(world, era, body) && !(grounded && stepUp(world, era, body))) {
        if (d > 0) body.x = Math.floor(body.x + body.hw) - body.hw - EPS;
        else body.x = Math.floor(body.x - body.hw) + 1 + body.hw + EPS;
        if (hits(world, era, body)) body.x -= d; // fallback
        body.hitX = true;
        body.vx = 0;
      }
    }
    // Z
    d = body.vz * sdt;
    if (d) {
      body.z += d;
      if (hits(world, era, body) && !(grounded && stepUp(world, era, body))) {
        if (d > 0) body.z = Math.floor(body.z + body.hd) - body.hd - EPS;
        else body.z = Math.floor(body.z - body.hd) + 1 + body.hd + EPS;
        if (hits(world, era, body)) body.z -= d;
        body.hitZ = true;
        body.vz = 0;
      }
    }
    // Y
    d = body.vy * sdt;
    if (d) {
      body.y += d;
      if (hits(world, era, body)) {
        if (d < 0) {
          body.y = Math.floor(body.y) + 1;
          body.onGround = true;
        } else {
          body.y = Math.floor(body.y + body.h) - body.h - EPS;
          body.hitCeil = true;
        }
        if (hits(world, era, body)) body.y -= d;
        body.vy = 0;
      }
    }
  }
  // ground probe (resting contact)
  if (!body.onGround && body.vy <= 0) {
    body.onGround = world.boxHits(era, body.x - body.hw, body.y - 0.05, body.z - body.hd, body.x + body.hw, body.y, body.z + body.hd);
  }
  // walking down a slope: keep to the ground, one step at a time, rather than falling off each one
  if (body.stepUp && grounded && !body.onGround && body.vy <= 0) {
    const oy = body.y, ny = Math.round(oy) - 1;
    if (Math.abs(oy - Math.round(oy)) < 0.2) {
      body.y = ny;
      if (!hits(world, era, body) && world.boxHits(era, body.x - body.hw, ny - 0.05, body.z - body.hd, body.x + body.hw, ny, body.z + body.hd)) {
        body.onGround = true;
        body.vy = 0;
        body.stepped += ny - oy;
      } else body.y = oy;
    }
  }
}

/** Walking into a step one block high: up onto it (for bodies that can, on a chapter with slopes). */
function stepUp(world, era, body) {
  if (!body.stepUp) return false;
  const oy = body.y, ny = Math.floor(oy + 0.05) + 1;
  if (ny - oy > 1.06) return false;
  body.y = ny;
  if (hits(world, era, body)) {
    body.y = oy;
    return false;
  }
  body.stepped += ny - oy;
  return true;
}

export function hits(world, era, b) {
  return world.boxHits(era, b.x - b.hw, b.y, b.z - b.hd, b.x + b.hw, b.y + b.h, b.z + b.hd, T.SOLID);
}

export function overlapsType(world, era, b, type, yFrom = 0, yTo = 1) {
  return world.boxHits(era, b.x - b.hw, b.y + b.h * yFrom, b.z - b.hd, b.x + b.hw, b.y + b.h * yTo, b.z + b.hd, type);
}
