/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { describe, it, expect } from "vitest";
import { interpolate } from "./template";

describe("interpolate", () => {
  describe("basic interpolation", () => {
    it("should replace single variable", () => {
      const template = "Hello {name}";
      const variables = { name: "World" };
      expect(interpolate(template, variables)).toBe("Hello World");
    });

    it("should replace multiple variables", () => {
      const template = "Hello {name}, you are {age} years old";
      const variables = { name: "Alice", age: "30" };
      expect(interpolate(template, variables)).toBe(
        "Hello Alice, you are 30 years old"
      );
    });

    it("should replace same variable multiple times", () => {
      const template = "{name} says hello to {name}";
      const variables = { name: "Bob" };
      expect(interpolate(template, variables)).toBe("Bob says hello to Bob");
    });

    it("should handle alphanumeric variable names", () => {
      const template = "Value: {var1}, Another: {var2a}";
      const variables = { var1: "test", var2a: "value" };
      expect(interpolate(template, variables)).toBe(
        "Value: test, Another: value"
      );
    });

    it("should handle numeric variable names", () => {
      const template = "Value: {var1}";
      const variables = { var1: "123" };
      expect(interpolate(template, variables)).toBe("Value: 123");
    });
  });

  describe("missing variables", () => {
    it("should leave placeholder unchanged when variable is missing", () => {
      const template = "Hello {name}, missing: {missing}";
      const variables = { name: "World" };
      expect(interpolate(template, variables)).toBe(
        "Hello World, missing: {missing}"
      );
    });

    it("should leave all placeholders unchanged when no variables provided", () => {
      const template = "Hello {name}, you are {age} years old";
      const variables = {};
      expect(interpolate(template, variables)).toBe(
        "Hello {name}, you are {age} years old"
      );
    });

    it("should handle undefined variable value", () => {
      const template = "Hello {name}";
      const variables = { name: undefined as unknown as string };
      expect(interpolate(template, variables)).toBe("Hello {name}");
    });
  });

  describe("edge cases", () => {
    it("should handle empty template", () => {
      const template = "";
      const variables = { name: "World" };
      expect(interpolate(template, variables)).toBe("");
    });

    it("should handle template with no placeholders", () => {
      const template = "Hello World";
      const variables = { name: "Alice" };
      expect(interpolate(template, variables)).toBe("Hello World");
    });

    it("should handle empty variables object", () => {
      const template = "Hello {name}";
      const variables = {};
      expect(interpolate(template, variables)).toBe("Hello {name}");
    });

    it("should handle template with only placeholders", () => {
      const template = "{name}";
      const variables = { name: "Alice" };
      expect(interpolate(template, variables)).toBe("Alice");
    });
  });

  describe("HTML escaping", () => {
    it("should not escape HTML when escapeHtml is false", () => {
      const template = "Value: {value}";
      const variables = { value: "<script>alert('xss')</script>" };
      expect(interpolate(template, variables, false)).toBe(
        "Value: <script>alert('xss')</script>"
      );
    });

    it("should not escape HTML when escapeHtml is undefined", () => {
      const template = "Value: {value}";
      const variables = { value: "<div>content</div>" };
      expect(interpolate(template, variables)).toBe(
        "Value: <div>content</div>"
      );
    });

    it("should escape HTML entities when escapeHtml is true", () => {
      const template = "Value: {value}";
      const variables = { value: "<script>alert('xss')</script>" };
      expect(interpolate(template, variables, true)).toBe(
        "Value: &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
      );
    });

    it("should escape ampersand", () => {
      const template = "Value: {value}";
      const variables = { value: "A & B" };
      expect(interpolate(template, variables, true)).toBe("Value: A &amp; B");
    });

    it("should escape less than and greater than", () => {
      const template = "Value: {value}";
      const variables = { value: "<tag>" };
      expect(interpolate(template, variables, true)).toBe("Value: &lt;tag&gt;");
    });

    it("should escape double quotes", () => {
      const template = "Value: {value}";
      const variables = { value: 'Say "hello"' };
      expect(interpolate(template, variables, true)).toBe(
        "Value: Say &quot;hello&quot;"
      );
    });

    it("should escape single quotes", () => {
      const template = "Value: {value}";
      const variables = { value: "It's working" };
      expect(interpolate(template, variables, true)).toBe(
        "Value: It&#39;s working"
      );
    });

    it("should escape square brackets", () => {
      const template = "Value: {value}";
      const variables = { value: "[content]" };
      expect(interpolate(template, variables, true)).toBe(
        "Value: &#91;content&#93;"
      );
    });

    it("should escape multiple HTML entities in same value", () => {
      const template = "Value: {value}";
      const variables = { value: '<a href="test">Link</a>' };
      expect(interpolate(template, variables, true)).toBe(
        "Value: &lt;a href=&quot;test&quot;&gt;Link&lt;/a&gt;"
      );
    });

    it("should not escape non-HTML content when escapeHtml is true", () => {
      const template = "Value: {value}";
      const variables = { value: "Plain text" };
      expect(interpolate(template, variables, true)).toBe("Value: Plain text");
    });

    it("should escape HTML in multiple variables", () => {
      const template = "Name: {name}, Email: {email}";
      const variables = {
        name: "<b>John</b>",
        email: "test@example.com",
      };
      expect(interpolate(template, variables, true)).toBe(
        "Name: &lt;b&gt;John&lt;/b&gt;, Email: test@example.com"
      );
    });

    it("should leave missing variables unchanged even with HTML escaping", () => {
      const template = "Value: {value}, Missing: {missing}";
      const variables = { value: "<script>" };
      expect(interpolate(template, variables, true)).toBe(
        "Value: &lt;script&gt;, Missing: {missing}"
      );
    });

    it("should handle placeholders that have a dot in the name", () => {
      const template = "Value: {value.test}";
      const variables = { "value.test": "test" };
      expect(interpolate(template, variables, true)).toBe("Value: test");
    });
  });
});
