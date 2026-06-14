declare module 'stats.js' {
  export default class Stats {
    dom: HTMLDivElement;
    domElement: HTMLDivElement;
    begin(): void;
    end(): void;
    showPanel(id: number): void;
  }
}
