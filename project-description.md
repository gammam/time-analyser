# Project Context: Agile Workflow & DORA Metrics Integration

## 1. Background (Organizational & Process Context)
The client organization (PagoPA S.p.A.) operates with a microservices architecture and manages software development through Agile teams [1, 2]. To overcome bottlenecks caused by external service dependencies in the UAT environment and alleviate the QA & Operations load, a "Shift-Left" operating model has been defined:
* **Product Trio**: Comprising the Product Owner, Technical Leader/Software Architect, and Product Designer, this collaborative leadership group is responsible for Product Discovery [3, 4]. They balance risks and define the requirements, prioritizing the "WHAT" and the "WHY" [4].
* **CU DevEx & CU Quality Assurance, Testing e Monitoraggio**: These Competence Units act as technical enablers [5, 6]. They provide mocks for external services and automated testing infrastructure for the early environments (DEV and TEST).
* **Development Teams**: Within the Service Lines (e.g., SEND), these cross-functional, self-organizing teams own the execution, deciding "HOW" features are implemented [7]. They develop and test autonomously in DEV and TEST using mocks, and release to UAT for real integration and acceptance [7, 8].
* **SL QA & Operations**: Transitions from executing manual intermediate tests to managing the final Quality Gate [2, 9]. They authorize the transition from UAT to PROD and handle operations, monitoring, and incident management [9].

## 2. Architecture & Data Model (Jira State Machine)
The process relies on a two-level Jira ticket hierarchy to map the Agile journey and effectively separate responsibilities [8]:
1. **Initiative (Level 1)**: Represents the high-level strategic business feature, managed by the Product Trio [8].
2. **Epic (Level 2)**: Represents the technical implementation of a single microservice, associated with a specific repository and owned by a single Development Team, prioritized in the Product Backlog [8].

### Epic State Machine Mapping:
* **TO DO Category**:
  * `DRAFT / DISCOVERY`: Explored by the Product Trio.
  * `EVALUATION / REFINEMENT`: Cost/benefit analysis and requirement breakdown.
  * `PLANNED / ENABLING PREP`: Waiting for mocks and automated pipelines from DevEx/QA.
* **IN PROGRESS Category**:
  * `EXECUTION (DEV & TEST)`: Active development and automated mock testing by the Dev Team.
  * `DEPLOYED TO UAT (INTEGRATION)`: Real service integration and stakeholder validation (Sprint Review).
  * `QA GATE (EVALUATION)`: Reliability, security, and performance checks by SL QA & Operations.
  * `READY FOR PROD`: Waiting for the deployment window.
* **DONE Category**:
  * `DONE (DEPLOYED)`: Successfully released in Production.
  * `CANCELLED`: Idea discarded during discovery/evaluation.

## 3. Mission
The AI Agent (acting as an Engineering & Data Assistant) must design and develop a Python or Node.js application integrating with Jira REST APIs. The goal is to automatically extract workflow data and calculate the DORA (DevOps Research and Assessment) Metrics for each development team/repository. These metrics are intended to support continuous improvement during team Sprint Retrospectives, and not for punitive evaluation.

## 4. Deliverables & Calculation Logic
The application will calculate the following four DORA metrics using Jira's JQL and API endpoints:
1. **Deployment Frequency**:
   * *API Action*: JQL query to extract the *Fix Versions* associated with a specific team/component that have the status `Released`.
   * *Calculation*: Count the total number of successful production releases within a given timeframe (e.g., weekly or monthly).
2. **Lead Time for Changes**:
   * *API Action*: Query individual Epic endpoints expanding the `changelog` parameter to extract the history of state transitions.
   * *Calculation*: Calculate the time difference between the timestamp when the Epic enters `EXECUTION (DEV & TEST)` and the timestamp it reaches `DONE (DEPLOYED)`. Identify bottlenecks (e.g., excessive time spent in `QA GATE`).
3. **Change Failure Rate (CFR)**:
   * *API Action*: JQL query to find all `Bug` or `Incident` tickets created in the PROD environment by the QA & Operations team, identifying the responsible release via the `Affects Version/s` field.
   * *Calculation*: `(Number of releases with at least 1 associated Bug) / (Total number of team releases)`.
4. **Mean Time To Recovery (MTTR)**:
   * *API Action*: JQL query strictly targeting `Incident` or `Bug` tickets opened in the PROD environment.
   * *Calculation*: Average time difference between the ticket's `created` timestamp and its `resolutiondate` (when the hotfix was released and the ticket closed).