declare module 'stats.js' {
  export default class Stats {
    dom: HTMLDivElement;
    domElement: HTMLDivElement;
    begin(): void;
    end(): number;
    showPanel(id: number): void;
  }
}
