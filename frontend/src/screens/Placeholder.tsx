import { Card, Notice, PageHeader } from "../components/ui";

/** Stands in for a screen that is built in a later phase, so that the navigation can already be tried. */
export function Placeholder({ title, flow }: { title: string; flow: string }) {
  return (
    <>
      <PageHeader eyebrow={flow} title={title} />
      <Card><Notice tone="info" title="Built in the next phase">This screen is part of the {flow.toLowerCase()} and comes after the foundation.</Notice></Card>
    </>
  );
}

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card><Notice tone="warning" title="This page does not exist or you do not have access to it.">Use the navigation to go back.</Notice></Card>
    </>
  );
}
