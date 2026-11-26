/* =====================================================================
   data.js: your notes live here. Add subjects, topics and answers in this format.
   Topic names are matched with the topics you type in the planner.
   short = 2 marks, medium = 5 marks, long = 10 marks, pyq = past questions
   (add "y" for the year if you know it), quiz = [question, [4 options], index of
   the correct option starting from 0].
   ===================================================================== */
const LIBRARY = {

  "DBMS": {
    "Normalization": {
      short: [
        {q:"What is normalization?", a:"Normalization is the process of organizing data into tables to reduce redundancy and avoid insertion, update and deletion anomalies."},
        {q:"Define 1NF.", a:"A table is in 1NF when every attribute holds only atomic (single) values and there are no repeating groups."}],
      medium: [
        {q:"Why is normalization used?", a:"1. Reduces data redundancy (the same data is not stored again and again).\n2. Removes insertion, update and deletion anomalies.\n3. Saves storage space.\n4. Keeps data consistent across tables.\n5. Makes the database design easier to maintain and extend."}],
      long: [
        {q:"Explain 1NF, 2NF and 3NF with an example.", a:"1NF: every attribute is atomic, with no repeating groups.\n2NF: the table is in 1NF and has no partial dependency, so every non-key attribute depends on the whole primary key.\n3NF: the table is in 2NF and has no transitive dependency (A determines B, B determines C, so C depends on A only through B).\nExample: Student(Roll, Name, Course, Fee). Fee depends on Course, not on Roll, which is a transitive dependency. Split it into Student(Roll, Name, Course) and Course(Course, Fee)."}],
      pyq: [{q:"Why is normalization used? Explain with an example."}, {q:"Differentiate between 2NF and 3NF."}],
      quiz: [
        ["Normalization mainly reduces which problem?", ["Data redundancy","Number of users","Network speed","Screen size"], 0],
        ["2NF removes which dependency?", ["Transitive","Partial","Multivalued","Join"], 1],
        ["A table with only atomic values is in which form?", ["3NF","BCNF","1NF","2NF"], 2]]
    },
    "Transactions": {
      short: [
        {q:"What is a transaction?", a:"A transaction is a logical unit of work made of one or more database operations that must be completed fully or not at all."},
        {q:"What does ACID stand for?", a:"Atomicity, Consistency, Isolation and Durability."}],
      medium: [
        {q:"What is a serializable schedule?", a:"A schedule is the order in which operations of several concurrent transactions are executed. A schedule is serializable if its result is the same as some serial schedule, where the transactions run one after another. It keeps the database consistent even when transactions run together. Types: conflict serializable and view serializable."},
        {q:"Explain transaction failure.", a:"A transaction fails when it cannot complete normally. Common causes: logical error (like divide by zero), system crash (power cut or OS failure) and disk failure. The DBMS rolls back the incomplete transaction using the log, so the database returns to a consistent state."}],
      long: [
        {q:"Explain log-based recovery.", a:"The DBMS keeps a log file that records every change before it is made permanent.\nLog records: <T start>, <T, X, old value, new value> and <T commit>.\nDeferred update: changes are written to the database only after commit. After a crash, committed transactions are redone.\nImmediate update: changes may be written before commit. After a crash, committed transactions are redone and uncommitted ones are undone using the old values.\nThis keeps atomicity and durability even after a failure."}],
      pyq: [{q:"What is a serializable schedule? Explain its types."}, {q:"Explain log-based recovery with an example."}],
      quiz: [
        ["Which ACID property means all or nothing?", ["Isolation","Atomicity","Durability","Consistency"], 1],
        ["Log-based recovery uses the log to...", ["Print reports","Redo and undo changes","Delete tables","Create indexes"], 1],
        ["A serializable schedule gives the same result as a...", ["Serial schedule","Failed schedule","Empty schedule","Random schedule"], 0]]
    },
    "SQL Basics": {
      short: [
        {q:"Differentiate DDL and DML.", a:"DDL (CREATE, ALTER, DROP) defines the structure of the database. DML (INSERT, UPDATE, DELETE, SELECT) works on the data inside the tables."}],
      medium: [
        {q:"Create an employee table and insert records.", a:"CREATE TABLE employee (\n  emp_id INT PRIMARY KEY,\n  name VARCHAR(50),\n  dept VARCHAR(30),\n  salary DECIMAL(10,2)\n);\nINSERT INTO employee VALUES (1, 'Amit', 'IT', 45000);\nINSERT INTO employee VALUES (2, 'Neha', 'HR', 38000);"},
        {q:"Create an employee detail table using SELECT.", a:"CREATE TABLE employee_detail AS\nSELECT emp_id, name, dept FROM employee;\nThe new table gets the selected columns and their rows from employee."}],
      long: [
        {q:"Explain the main SQL commands with examples.", a:"CREATE: CREATE TABLE student (id INT, name VARCHAR(30));\nINSERT: INSERT INTO student VALUES (1, 'Ravi');\nSELECT: SELECT * FROM student WHERE id = 1;\nUPDATE: UPDATE student SET name = 'Rahul' WHERE id = 1;\nDELETE: DELETE FROM student WHERE id = 1;\nDROP: DROP TABLE student;"}],
      pyq: [{q:"Write SQL to create an employee table and insert 3 records."}, {q:"How do you create a new table from an existing table?"}],
      quiz: [
        ["Which command creates a table?", ["MAKE TABLE","CREATE TABLE","BUILD TABLE","NEW TABLE"], 1],
        ["INSERT belongs to which group?", ["DDL","DCL","DML","TCL"], 2],
        ["CREATE TABLE ... AS SELECT does what?", ["Deletes a table","Copies data into a new table","Renames a table","Adds an index"], 1]]
    }
  },

  "Python": {
    "Lists": {
      short: [
        {q:"What is a list in Python?", a:"A list is an ordered, mutable collection of items written inside square brackets, like [1, 2, 3]."}],
      medium: [
        {q:"Explain common list methods.", a:"append(x): adds x at the end.\ninsert(i, x): adds x at index i.\nremove(x): removes the first x.\npop(): removes and returns the last item.\nsort(): sorts the list.\nreverse(): reverses the order."}],
      long: [
        {q:"Write a program to perform list operations.", a:"nums = [10, 20, 30]\nnums.append(40)        # add\nnums.insert(1, 15)     # insert\nnums[0] = 5            # update\nnums.remove(30)        # delete by value\nprint(nums)            # [5, 15, 20, 40]\nprint(nums[1:3])       # slice -> [15, 20]\nprint(max(nums), len(nums))   # 40 4"}],
      pyq: [{q:"Differentiate between list and tuple."}, {q:"Write a program to find the largest number in a list."}],
      quiz: [
        ["Lists are...", ["Immutable","Mutable","Constants","Keys"], 1],
        ["Which method removes the last item?", ["pop()","add()","push()","cut()"], 0],
        ["len([4, 5, 6]) gives...", ["2","4","6","3"], 3]]
    },
    "Functions": {
      short: [
        {q:"What is a function?", a:"A function is a reusable block of code that performs a task. It is defined with the def keyword and run by calling its name."}],
      medium: [
        {q:"Explain types of function arguments.", a:"Positional: values matched by position.\nKeyword: values passed as name=value.\nDefault: a value used when none is passed, like def f(a, b=5).\nVariable-length: *args collects extra positional values and **kwargs collects extra keyword values."}],
      long: [
        {q:"Explain functions with an example program.", a:"def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\ndef greet(name, msg='Hello'):\n    print(msg, name)\n\nprint(factorial(5))   # 120\ngreet('Asha')         # Hello Asha\nA function can take parameters, return a value with return, and call itself (recursion)."}],
      pyq: [{q:"Explain default and keyword arguments with examples."}, {q:"Write a recursive function to find a factorial."}],
      quiz: [
        ["Which keyword defines a function?", ["func","define","def","function"], 2],
        ["What does *args collect?", ["Extra positional values","Only strings","Keyword values","Nothing"], 0],
        ["A function that calls itself is...", ["Nested","Recursive","Anonymous","Static"], 1]]
    }
  },

  "Software Engineering": {
    "Risk Management": {
      short: [
        {q:"What is a risk?", a:"A risk is an uncertain event that, if it happens, can harm the project cost, schedule or quality.\nHinglish: risk ek aisi problem hai jo abhi hui nahi, par aage ho sakti hai."}],
      medium: [
        {q:"Explain the steps of risk management.", a:"1. Risk identification: list the possible risks.\n2. Risk analysis: find the probability and the impact of each risk.\n3. Risk planning: decide how to avoid or reduce it.\n4. Risk monitoring: keep watching and update the plan.\nHinglish: pehle risk dhoondo, phir uska chance aur nuksaan check karo, plan banao, aur lagataar monitor karo."}],
      long: [
        {q:"Explain risk management with types of risks and the RMMM plan.", a:"Types of risks: project risks (budget, schedule, staff), technical risks (design, tools, complexity) and business risks (market, customer, funding).\nRisk exposure = probability of the risk x cost of the loss.\nRMMM plan: Risk Mitigation (reduce the chance), Risk Monitoring (track it) and Risk Management (what to do if it happens, also called contingency).\nExample: if a key developer may leave, mitigation is documenting the code and training a backup."}],
      pyq: [{q:"Explain the risk management process."}, {q:"What is risk exposure? How is it calculated?"}],
      quiz: [
        ["Risk exposure is calculated as...", ["Cost / time","Probability x impact","Time + cost","Team size x days"], 1],
        ["RMMM stands for...", ["Risk Mitigation, Monitoring and Management","Risk Map and Money Management","Rapid Model Making Method","None of these"], 0],
        ["Which step comes first?", ["Monitoring","Planning","Identification","Analysis"], 2]]
    }
  }
};

/* =====================================================================
   SYLLABUS: units and topics from your syllabus. The + button uses this
   to add whole subjects at once. Topic names that match a topic in LIBRARY
   above get their notes automatically.
   ===================================================================== */
const SYLLABUS = {
  "Python Programming": {
    "Unit I": ["Introduction to Python", "Strings", "Control Flow Statements"],
    "Unit II": ["Functions", "Lists, Tuples and Dictionaries", "Math and NumPy Module", "Classes, Inheritance and Polymorphism", "Python Regex"],
    "Unit III": ["File Handling", "Exception Handling", "Tkinter GUI", "Data Visualization"],
    "Lab": ["Lab Programs"]
  },
  "Software Engineering": {
    "Unit I": ["Layered Technology and Process Framework", "Process Models", "Agile Software Development"],
    "Unit II": ["Requirements Engineering", "Risk Management", "Project Planning"],
    "Unit III": ["Design Concepts and Architecture", "UML Diagrams", "Software Implementation", "Testing Strategies", "Product Metrics"],
    "Unit IV": ["Quality Management", "Release Management", "Product Sustenance"]
  },
  "Feature Engineering": {
    "Unit I": ["Introduction to Feature Engineering", "Data Types and Features", "Basic Feature Preprocessing"],
    "Unit II": ["Numerical Feature Techniques", "Categorical Data Techniques", "Feature Selection Methods", "Feature Reduction and PCA"],
    "Lab": ["Lab Programs"]
  },
  "Probability and Statistics": {
    "Unit I": ["Basic Concepts of Statistics", "Measures of Central Tendency", "Measures of Dispersion"],
    "Unit II": ["Correlation", "Regression"],
    "Unit III": ["Concepts of Probability", "Random Variables", "Standard Probability Distributions"],
    "Unit IV": ["Sampling Distribution", "Statistical Inference", "Hypothesis Testing (Z and T Test)", "Chi Square Test"]
  }
};

/* Lab programs from your syllabus (add your solved programs as short/medium/long answers later) */
LIBRARY["Python"]["Lab Programs"] = { pyq: [
  {q:"Write a program to find whether a number is prime or not."},
  {q:"Write a program to print m raised to the power n, where m and n are read from the user."},
  {q:"Write a program having a parameterized function that returns True or False depending on whether the parameter passed is even or odd."},
  {q:"Write a program to print the summation of the series up to n terms: 1-2+3-4+5-6+7 ..."},
  {q:"Write a menu driven program to perform these operations on strings using built-in functions: (a) find the frequency of a character, (b) replace a character by another character, (c) remove the first occurrence of a character, (d) remove all occurrences of a character."},
  {q:"Write a program that accepts two strings and returns the indices of all occurrences of the second string in the first string as a list. If the second string is not present, return -1."},
  {q:"Using the NumPy module, write a menu driven program to: (a) create an array filled with 1's, and the other operations listed in your lab file."}] };
LIBRARY["Feature Engineering"] = { "Lab Programs": { pyq: [
  {q:"Handle missing values in column(s) of a dataset, for example fill missing values with the mean, median or mode of columns such as Age, Height, Weight and Grade."},
  {q:"Clean a dataset by identifying and removing invalid data entries, for example a dataset with columns Name, Gender and Age where Name contains invalid data."},
  {q:"Scale numerical features using Min-Max normalization for a dataset with columns like Height and Weight."},
  {q:"Perform exploratory data analysis and visualize data distributions using histograms and box plots."}] } };
