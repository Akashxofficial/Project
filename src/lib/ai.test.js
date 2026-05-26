import { describe, it, expect } from "vitest";
import { fixMathFormatting } from "./ai";

describe("AI Math LaTeX Post-Processor (fixMathFormatting)", () => {
  it("should return empty or non-string input directly", () => {
    expect(fixMathFormatting("")).toBe("");
    expect(fixMathFormatting(null)).toBe(null);
  });

  it("should translate Unicode superscripts into LaTeX exponents", () => {
    const output = fixMathFormatting("v² is the velocity squared.");
    expect(output).toContain("$v^2$");
  });

  it("should translate multi-character negative exponents with brackets", () => {
    const output = fixMathFormatting("The constant is 10⁻⁷.");
    // 10⁻⁷ -> 1$0^-^7$
    expect(output).toContain("1$0^-^7$");
  });

  it("should translate Unicode subscripts into LaTeX subscripts", () => {
    const output = fixMathFormatting("Water formula is H₂O.");
    expect(output).toContain("$H_2$O");
  });

  it("should wrap simple bare equations in math dollar signs", () => {
    const output = fixMathFormatting("Newton second law: F=ma or V=IR for voltage.");
    expect(output).toContain("$F = ma$");
    expect(output).toContain("$V = IR$");
  });

  it("should skip wrapping bare equations if it looks like English text", () => {
    const output = fixMathFormatting("Here is a text equation: a = dynamic parameter because it is wordy.");
    expect(output).not.toContain("$a = dynamic parameter because it is wordy$");
  });

  it("should not double-wrap if already inside dollar signs", () => {
    const output = fixMathFormatting("Given $v^2$ already wrapped.");
    expect(output).toBe("Given $v^2$ already wrapped.");
  });

  it("should format proportionality equations beautifully", () => {
    const output = fixMathFormatting("B∝I/r");
    expect(output).toContain("$B \\propto \\frac{I}{r}$");
  });

  it("should translate Greek unicode letters into LaTeX equivalents inside math context", () => {
    const output = fixMathFormatting("The phase angle is θ=wt.");
    expect(output).toContain("$\\theta$");
  });

  it("should skip wrapping Greek letters if they are in standard prose", () => {
    const output = fixMathFormatting("The angle θ is measured in radians.");
    expect(output).toBe("The angle θ is measured in radians.");
  });
});
