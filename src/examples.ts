// Runnable example emitted by `testrazor init`: two runs where one test flakes.
export const EXAMPLE_RUN_1 = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="cart">
    <testcase classname="cart" name="adds an item"/>
    <testcase classname="cart" name="applies a flaky discount"/>
  </testsuite>
</testsuites>
`;

export const EXAMPLE_RUN_2 = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="cart">
    <testcase classname="cart" name="adds an item"/>
    <testcase classname="cart" name="applies a flaky discount"><failure message="timeout"/></testcase>
  </testsuite>
</testsuites>
`;
