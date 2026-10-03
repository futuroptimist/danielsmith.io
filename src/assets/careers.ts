import type {
  CareerId,
  CareerPoiId,
  CareerProvenance,
} from '../scene/poi/types';

export interface CareerHistoryEntry {
  id: CareerId;
  poiId: CareerPoiId;
  startDate: string;
  endDate: string | null;
  provenance: readonly CareerProvenance[];
}

const resumeSource =
  'https://github.com/futuroptimist/danielsmith.io/blob/main/docs/resume/2026-08/resume.tex';

/** Reviewed dates and provenance; both career surfaces resolve the same localized copy. */
export const CAREER_HISTORY: readonly CareerHistoryEntry[] = [
  {
    id: 'muon-space',
    poiId: 'career-muon-space',
    startDate: '2026-09',
    endDate: null,
    provenance: [
      { kind: 'owner-confirmed' },
      {
        kind: 'public-role-posting',
        href: 'https://job-boards.greenhouse.io/muonspace/jobs/5083758007',
      },
    ],
  },
  {
    id: 'youtube',
    poiId: 'career-youtube',
    startDate: '2018-09',
    endDate: '2025-05',
    provenance: [{ kind: 'resume', href: resumeSource }],
  },
  {
    id: 'naval-research',
    poiId: 'career-naval-research',
    startDate: '2017-01',
    endDate: '2018-09',
    provenance: [{ kind: 'resume', href: resumeSource }],
  },
  {
    id: 'southern-mississippi',
    poiId: 'career-southern-mississippi',
    startDate: '2014-03',
    endDate: '2016-12',
    provenance: [{ kind: 'resume', href: resumeSource }],
  },
];
