import { BoxGeometry, Color, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import type { RoomDefinition } from '../floorPlan';
import { createRoomCeilingPanels } from '../structures/ceilingPanels';

const createRoom = (overrides: Partial<RoomDefinition> = {}): RoomDefinition => ({
  id: 'room',
  name: 'Room',
  bounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 8 },
  ledColor: 0xff8844,
  ...overrides,
});

describe('createRoomCeilingPanels', () => {
  it('creates tinted ceiling panels for interior rooms', () => {
    const interiorA = createRoom({ id: 'livingRoom', name: 'Living Room' });
    const interiorB = createRoom({
      id: 'studio',
      name: 'Studio',
      bounds: { minX: -4, maxX: 6, minZ: 2, maxZ: 14 },
      ledColor: 0x44c2ff,
    });
    const backyard = createRoom({
      id: 'backyard',
      name: 'Backyard',
      category: 'exterior',
      bounds: { minX: -6, maxX: 12, minZ: 12, maxZ: 22 },
    });

    const { group, panels } = createRoomCeilingPanels([
      interiorA,
      interiorB,
      backyard,
    ]);

    expect(group.children).toHaveLength(2);
    expect(panels.map((panel) => panel.roomId)).toEqual(['livingRoom', 'studio']);

    const firstPanel = panels[0]!.mesh;
    expect(firstPanel.receiveShadow).toBe(true);
    expect(firstPanel.name).toContain('Ceiling');

    const geometry = firstPanel.geometry as BoxGeometry;
    expect(geometry.parameters.width).toBeCloseTo(10 - 0.9 * 2, 5);
    expect(geometry.parameters.depth).toBeCloseTo(8 - 0.9 * 2, 5);
    expect(geometry.parameters.height).toBeCloseTo(0.3, 5);

    const expectedColor = new Color(0x1f2636).lerp(new Color(interiorA.ledColor), 0.28);
    const material = firstPanel.material as MeshStandardMaterial;
    expect(material.color.getHex()).toBeCloseTo(expectedColor.getHex());
  });

  it('supports overriding geometry and materials while skipping tiny rooms', () => {
    const narrowRoom = createRoom({
      id: 'alcove',
      name: 'Alcove',
      bounds: { minX: 0, maxX: 0.15, minZ: 0, maxZ: 0.3 },
    });

    const sharedMaterial = new MeshStandardMaterial({ color: 0x224466 });
    const sharedResult = createRoomCeilingPanels([narrowRoom], {
      material: sharedMaterial,
    });
    expect(sharedResult.panels).toHaveLength(0);

    const factoryRoom = createRoom({
      id: 'loft',
      name: 'Loft',
      bounds: { minX: -2, maxX: 4, minZ: -1, maxZ: 5 },
      ledColor: 0xffffff,
    });

    const { panels } = createRoomCeilingPanels([factoryRoom], {
      height: 4.2,
      inset: 0.5,
      thickness: 0.4,
      materialFactory: (room) => {
        expect(room.id).toBe('loft');
        const material = new MeshStandardMaterial({ color: 0xbbbbbb });
        material.name = `ceiling-${room.id}`;
        return material;
      },
    });

    expect(panels).toHaveLength(1);
    const panelMesh = panels[0]!.mesh;
    const panelGeometry = panelMesh.geometry as BoxGeometry;
    expect(panelGeometry.parameters.width).toBeCloseTo(6 - 0.5 * 2, 5);
    expect(panelGeometry.parameters.depth).toBeCloseTo(6 - 0.5 * 2, 5);
    expect(panelGeometry.parameters.height).toBeCloseTo(0.4, 5);
    expect(panelMesh.position.y).toBeCloseTo(4.2, 5);

    const panelMaterial = panelMesh.material as MeshStandardMaterial;
    expect(panelMaterial.name).toBe('ceiling-loft');
    expect(panelMaterial.color.getHex()).toBe(0xbbbbbb);

    const sharedMaterialResult = createRoomCeilingPanels([factoryRoom], {
      material: sharedMaterial,
      inset: 0.2,
      thickness: 0.5,
    });
    const sharedPanel = sharedMaterialResult.panels[0]!.mesh;
    const sharedGeometry = sharedPanel.geometry as BoxGeometry;
    expect(sharedGeometry.parameters.height).toBeCloseTo(0.5, 5);
    expect((sharedPanel.material as MeshStandardMaterial).color.getHex()).toBe(
      sharedMaterial.color.getHex()
    );
    expect(sharedPanel.material).not.toBe(sharedMaterial);
  });
});
