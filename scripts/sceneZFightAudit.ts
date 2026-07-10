import {
  collectProductionHorizontalSurfaces,
  findHorizontalZFightCandidates,
  formatZFightFindings,
} from '../src/scene/level/zFightAudit';

const findings = findHorizontalZFightCandidates(
  collectProductionHorizontalSurfaces()
);

if (findings.length > 0) {
  console.error('Coplanar horizontal z-fighting candidates detected:');
  console.error(formatZFightFindings(findings));
  process.exit(1);
}

console.log('No coplanar horizontal z-fighting candidates detected.');
