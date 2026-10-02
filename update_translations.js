const fs = require('fs');
['en','hi','ta'].forEach(lang => { 
  const path = "messages/" + lang + ".json";
  const data = JSON.parse(fs.readFileSync(path, 'utf8')); 
  data.dashboard.publicWorks = { 
    title: 'Public Works & Infrastructure', 
    subtitle: 'Live status of projects, work orders, and maintenance crews', 
    openWorkOrders: 'Open Work Orders', 
    activeCrews: 'Active Crews', 
    projectsInProgress: 'Projects In Progress', 
    slaRisk: 'SLA Risk', 
    priorityQueue: 'Priority Work Order Queue', 
    projectPortfolio: 'Infrastructure Project Portfolio' 
  }; 
  fs.writeFileSync(path, JSON.stringify(data, null, 2)); 
});
