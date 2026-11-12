import { describe, expect, it } from "vitest";
import exported from "../../../public/data/dashboard.json";
import type { DashboardData } from "../data";
import { buildQuestions, masterRow } from "../questions";

const data = exported as unknown as DashboardData;
const questions = buildQuestions(data);

describe("question registry", () => {
  it("answers eleven questions, each with the six parts filled in", () => {
    expect(questions).toHaveLength(11);
    for (const question of questions) {
      expect(question.question.length).toBeGreaterThan(10);
      expect(question.method.length).toBeGreaterThan(5);
      expect(question.target.length).toBeGreaterThan(5);
      expect(question.meaning.length).toBeGreaterThan(10);
      expect(question.findings.length).toBeGreaterThanOrEqual(3);
      expect(question.findings.length).toBeLessThanOrEqual(5);
    }
  });

  it("never prints a blank or broken number", () => {
    const text = questions.flatMap((question) => [question.question, question.target, question.meaning, ...question.findings]).join("\n");
    expect(text).not.toMatch(/NaN|undefined|\[object|Infinity/);
  });

  it("makes the master table key result the first finding, so the two always agree", () => {
    for (const question of questions) {
      const row = masterRow(question);
      expect(row["Key Result"]).toBe(question.findings[0]);
      expect(row["What It Means"]).toBe(question.meaning);
    }
  });

  it("reports the classifier as missing the precision and ROC-AUC targets", () => {
    const classifier = questions.find((question) => question.id === "classifier");
    expect(classifier?.meaning).toContain("precision");
    expect(classifier?.meaning).toContain("ROC-AUC");
  });
});
