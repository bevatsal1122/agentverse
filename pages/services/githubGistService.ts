interface GistFile {
  content: string;
}

interface GistData {
  description: string;
  public: boolean;
  files: Record<string, GistFile>;
}

interface GistResponse {
  html_url: string;
  id: string;
  description: string;
}

export class GitHubGistService {
  private static instance: GitHubGistService;
  private githubToken: string;

  private constructor() {
    this.githubToken = process.env.GITHUB_TOKEN || '';
  }

  public static getInstance(): GitHubGistService {
    if (!GitHubGistService.instance) {
      GitHubGistService.instance = new GitHubGistService();
    }
    return GitHubGistService.instance;
  }

  public async createTaskGist(taskDescription: string, taskType: string): Promise<{ success: boolean; gistUrl?: string; error?: string }> {
    if (!this.githubToken) {
      console.warn('GitHub token not configured, skipping gist creation');
      return { success: false, error: 'GitHub token not configured' };
    }

    try {
      const gistContent = this.generateGistContent(taskDescription, taskType);
      
      const gistData: GistData = {
        description: `Task Created: ${taskType} - ${new Date().toISOString()}`,
        public: true,
        files: {
          'open-source-matters.md': {
            content: gistContent
          }
        }
      };

      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gistData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const gistResponse: GistResponse = await response.json();
      
      console.log(`✅ GitHub Gist created successfully: ${gistResponse.html_url}`);
      
      return {
        success: true,
        gistUrl: gistResponse.html_url
      };

    } catch (error) {
      console.error('❌ Failed to create GitHub Gist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private generateGistContent(taskDescription: string, taskType: string): string {
    const timestamp = new Date().toISOString();
    const taskInfo = `Task Type: ${taskType}\nTask Description: ${taskDescription}\nCreated: ${timestamp}`;

    return `====================================================
             ███╗   ███╗ █████╗ ██████╗ 
             ████╗ ████║██╔══██╗██╔══██╗
             ██╔████╔██║███████║██║  ██║
             ██║╚██╔╝██║██╔══██║██║  ██║
             ██║ ╚═╝ ██║██║  ██║██████╔╝
             ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝ 
====================================================
                 WHY OPEN SOURCE MATTERS
====================================================

> A magazine-style gist by Agents of the Multiverse

----------------------------------------------------
✦ TASK INFORMATION
----------------------------------------------------
${taskInfo}

----------------------------------------------------
✦ INTRODUCTION
----------------------------------------------------
Open Source is more than just free software.
It is the foundation of modern computing, collaboration,
and digital trust. From the Linux kernel to Python,
from Git to Kubernetes, open source powers the 
infrastructure of the internet.

----------------------------------------------------
✦ THE CORE PRINCIPLES
----------------------------------------------------
1. **Transparency**  
   Code is visible, auditable, and verifiable.

2. **Collaboration**  
   Developers across the globe contribute, improving 
   speed and quality of innovation.

3. **Freedom**  
   Anyone can use, modify, and share without 
   gatekeeping or hidden costs.

4. **Community**  
   Knowledge, experience, and effort are pooled 
   together for collective growth.

----------------------------------------------------
✦ WHY IT MATTERS TODAY
----------------------------------------------------
- **Security**: Many eyes find vulnerabilities.  
- **Innovation**: Shared tools accelerate progress.  
- **Education**: Learners get real-world references.  
- **Sustainability**: Communities outlast companies.  

----------------------------------------------------
✦ ICONIC PROJECTS
----------------------------------------------------
- GNU/Linux → The heart of servers, devices, and supercomputers.  
- Git → The tool that redefined collaboration.  
- Bitcoin → Open source code redefining money.  
- Filecoin/IPFS → Building the decentralized web.  

----------------------------------------------------
✦ ASCII REFLECTION
----------------------------------------------------
           .--.      .--.      .--.      .--.
        : (  ) :  : (  ) :  : (  ) :  : (  ) :
         '..'      '..'      '..'      '..'

  "Together we code, together we build the future."

----------------------------------------------------
✦ CONCLUSION
----------------------------------------------------
Open Source matters because it democratizes power, 
empowers creators, and ensures that the future 
of technology remains in the hands of the many, 
not the few.  

====================================================
END OF ISSUE
====================================================`;
  }
}

export const githubGistService = GitHubGistService.getInstance();
