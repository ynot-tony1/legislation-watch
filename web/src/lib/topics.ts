export const TOPIC_LABELS: Record<string, string> = {
  health: "Health",
  education: "Education",
  energy: "Energy",
  environment: "Environment",
  transport: "Transport",
  housing: "Housing",
  employment: "Employment",
  finance: "Finance",
  justice: "Justice",
  immigration: "Immigration",
  defence: "Defence",
  technology: "Technology",
  agriculture: "Agriculture",
  "local-government": "Local Government",
  welfare: "Welfare",
  other: "Other",
};

export function topicLabel(topic: string): string {
  return TOPIC_LABELS[topic] ?? topic.charAt(0).toUpperCase() + topic.slice(1);
}
