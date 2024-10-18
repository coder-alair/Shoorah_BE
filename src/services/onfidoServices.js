const { DefaultApi, Configuration, Region, WebhookEventVerifier } = require('@onfido/api');
const { onfido } = require('./../config/onfido');
const fs = require('fs');
const axios = require('axios');
const Expert = require('../models/Expert');
const {applicantStatusFetch} = require('./onfidoServices');

module.exports = {
  createApplicant: async (applicant) => {
    try {
      console.log(applicant, '<<<<<applicant');
      const newApplicant = await onfido.createApplicant({
        first_name: applicant.first_name,
        last_name: applicant.last_name,
        email: applicant.email
      });
      // const workflowRunBuilder = {
      //   applicant_id: newApplicant.data.id,
      //   workflow_id: '95e266ab-0bab-4a9d-ba43-69b51258c79c'
      // };

      // async function workFlow(workflowRunBuilder) {
      //   // Upload document to Onfido (using 'passport' as an example)
      //   try {
      //     const document = await onfido.createWorkflowRun(workflowRunBuilder);
      //     console.log('>>>>>>document', document);
      //     return document;
      //   } catch (error) {
      //     console.error('Error during Onfido document upload:', error.message);
      //     throw error;
      //   }
      // }
      // const runWorkFlow = await workFlow(workflowRunBuilder);

      // console.log('>>>runWorkFlow', runWorkFlow.data);
      // console.log('runWorkFlow?.data?.workflow_id', runWorkFlow?.data?.id);
      // const findWorkflowRun = await onfido.findWorkflowRun(runWorkFlow?.data?.id);
      // console.log(findWorkflowRun, '<<<<<<<<<<findWorkflowRun');

      console.log('newApplicant Details:', newApplicant);
      return newApplicant.data;
    } catch (error) {
      console.error('Error finding workflow run:', error.response?.data || error.message);
      if (error.response) {
        console.error('Full error response:', error.response);
      }
      // throw error;
    }
  },
  applicantStatusFetch: async (workflowRunId) => {
    const findWorkflowRun = await onfido.findWorkflowRun(workflowRunId);
    return findWorkflowRun || null;
  },
  getWorkflowById: async () => {
    try {
      // const workflow = await onfido.findWorkflowRun('42888a4f-cea6-44f1-9b98-5f97c1abfff7');
      const workflow = await onfido.findWorkflowRun('95e266ab-0bab-4a9d-ba43-69b51258c79c');
      console.log('Workflow Details:', workflow);
      return workflow;
    } catch (error) {
      console.error('Error retrieving workflow:', error);
      throw error;
    }
  },
  // uploadApplicantDocs: async (applicantId)=> {
  //   try {
  //     const filePath = "C:/Users/pc/Desktop/license.jpg"
  //     const data = fs.readFileSync(filePath)
  //     const fileData = data.toString('base64');
  //     console.log("🚀 ~ uploadApplicantDocs: ~ fileData:", fileData)
  //     const document = await onfido.uploadDocument( 'driving_licence', applicantId, {buffer: fileData, filename: "license.jpg"}
  //       // Document type, e.g., 'passport', 'driving_licence'
  //     );
  //     return document;
  //   } catch (error) {
  //     console.error('Error retrieving workflow:', error.message, "\ndata>>>>>", error.data);
  //     throw error;
  //   }
  // }

  // uploadApplicantDocs: async (applicantId, documentType, fileData, side) => {
  //   try {
  //     console.log(applicantId, documentType, '<<<applicantId, documentType, fileData');

  //     if (!applicantId) {
  //       throw new Error('Invalid applicantId: Cannot be null or undefined');
  //     }
  //     // Upload document to Onfido
  //     const document = await onfido.uploadDocument('passport', applicantId, fileData);

  //     return document;
  //   } catch (error) {
  //     console.error('Error during Onfido document upload:', error.message);
  //     throw error;
  //   }
  // }

  uploadApplicantDocs: async (applicantId= "425982ce-7cfe-4bcc-9712-7a308bcc8e5b", documentType, fileData, side) => {
    try {
      console.log(applicantId, documentType, side, '<<<applicantId, documentType, fileData, side');

      if (!applicantId) {
        throw new Error('Invalid applicantId: Cannot be null or undefined');
      }
      const workflowRunBuilder = {
        applicant_id: applicantId,
        workflow_id: '95e266ab-0bab-4a9d-ba43-69b51258c79c'
      };

      async function workFlow(workflowRunBuilder) {
        // Upload document to Onfido (using 'passport' as an example)
        try {
          const document = await onfido.createWorkflowRun(workflowRunBuilder);
          console.log('>>>>>>document', document);
          return document;
        } catch (error) {
          console.error('Error during Onfido document workflow run:', error.message);
          throw error;
        }
      }

      const expert = await Expert.findOne({ applicant_id: applicantId });
      let runWorkFlow;
      if (expert && !expert?.workflow_run_id) {
        runWorkFlow = await workFlow(workflowRunBuilder);
      }
      if (expert && !expert.workflow_run_id) {
        expert.workflow_run_id = runWorkFlow?.data.id;
        expert.save();
      }
      console.log(expert, '<<<<<<expert');
      // Upload document to Onfido (using 'passport' as an example)
      // const document = await onfido.findWorkflowRun('95e266ab-0bab-4a9d-ba43-69b51258c79c');
      // const document = await onfido.uploadDocument(documentType, applicantId, fileData, side);
      // console.log(document,"<<<<document")
      return document;
    } catch (error) {
      console.error('Error during Onfido document upload:', error.message);
      throw error;
    }
  },

  runWorkFlow: async (applicantId) => {
    try {

      if (!applicantId) {
        throw new Error('Invalid applicantId: Cannot be null or undefined');
      }
      const workflowRunBuilder = {
        applicant_id: applicantId,
        workflow_id: '95e266ab-0bab-4a9d-ba43-69b51258c79c',
        link: {
          completed_redirect_url: `${process.env.FRONTEND_URL}signupJourney/complianceAndVerification`, // Add your front-end completion URL here
          expired_redirect_url: `${process.env.FRONTEND_URL}signupJourney/complianceAndVerification` // Add your front-end expired URL here
        }
      };
      async function workFlow(workflowRunBuilder) {
        // Upload document to Onfido (using 'passport' as an example)
        try {
          const document = await onfido.createWorkflowRun(workflowRunBuilder);
          console.log('>>>>>>document', document);
          return document;
        } catch (error) {
          console.error('Error during Onfido document workflow run:', error.message);
          throw error;
        }
      }

      const expert = await Expert.findOne({ applicant_id: workflowRunBuilder?.applicant_id });
      let runWorkFlow;

    // Check if the expert already has a workflow_run_id
    if (expert) {
      if (!expert.workflow_run_id) {
        // No existing workflow_run_id, call workFlow function
        runWorkFlow = await workFlow(workflowRunBuilder);
        expert.workflow_run_id = runWorkFlow?.data.id; // Store the new ID
      } else {
        // Workflow already run, fetch the applicant status
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")

        async function applicantStatusFetch(workflowRunId) {
          try {
            const findWorkflowRun = await onfido.findWorkflowRun(workflowRunId);
            return findWorkflowRun || null;
          } catch (err) {
            // Optionally handle any errors here if needed
            console.error(err);
            return null;
          }
        }
        
        runWorkFlow = await applicantStatusFetch(expert.workflow_run_id);
        // return runWorkFlow; // Return the status instead
      }
      
      // Save the updated expert document
      await expert.save();
    }
      // if (expert && !expert?.workflow_run_id) {
      //   runWorkFlow = await workFlow(workflowRunBuilder);
      // }
      // if (expert) {
      //   expert.workflow_run_id = runWorkFlow?.data.id;
      //   expert.save();
      // }
      // console.log(expert.workflow_run_id, '<<<<<<expert');
      // Upload document to Onfido (using 'passport' as an example)
      // const document = await onfido.findWorkflowRun('95e266ab-0bab-4a9d-ba43-69b51258c79c');
      // const document = await onfido.uploadDocument(documentType, applicantId, fileData, side);
      // console.log(document,"<<<<document")
      return runWorkFlow.data;
    } catch (error) {
      console.error('Error during Onfido document upload:', error.message);
      throw error;
    }
  },

  // fetchDocumentStatus: async (applicantId) => {
  //   const url = 'https://dashboard-api.onfido.com/dashboard/json-api/workflow-api/workflow_runs';

  //   // Replace with your actual API token
  //   const apiToken = 'api_sandbox.h4dNJtvPDKK.x-JwJK2p2ItBItkRhNVT3yUmNzZ05hvY';

  //   const config = {
  //     headers: {
  //       'Accept': 'application/json',
  //       'Content-Type': 'application/json',
  //       'Authorization': `Token token='api_sandbox.h4dNJtvPDKK.x-JwJK2p2ItBItkRhNVT3yUmNzZ05hvY'`
  //     }
  //   };

  //   try {
  //     const response = await axios.get(url, config);

  //     console.log(response.data, "<<<< response.data");

  //     // Filter the response based on applicantId
  //     const filteredWorkflows = response.data.filter((workflow) => {
  //       return workflow.applicant_id === applicantId;
  //     });

  //     // Process and display the filtered workflows
  //     filteredWorkflows.forEach((workflow) => {
  //       console.log(`Workflow ID: ${workflow.id}`);
  //       console.log(`Applicant ID: ${workflow.applicant_id}`);
  //       console.log(`Status: ${workflow.status}`);
  //       console.log(`State: ${workflow.state}`);
  //       console.log(`Created At: ${workflow.created_at}`);
  //       console.log(`Profile Email: ${workflow.profile_data.email}`);
  //       console.log(`Workflow Title: ${workflow.workflow.title}`);
  //       console.log(`Link: ${workflow.link.url}`);
  //       console.log('----------------------');
  //     });

  //     if (filteredWorkflows.length === 0) {
  //       console.log(`No workflows found for applicant ID: ${applicantId}`);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching document status:', error.message);
  //     console.error('Error details:', error.response ? error.response.data : error);
  //   }
  // },

  fetchDocumentStatus: async (applicantId) => {
    try {
      console.log(applicantId, '<<<<<<<<<<<<<applicantId');
      const document = await onfido.listChecks(applicantId);
      // Document type, e.g., 'passport', 'driving_licence'
      // console.log(document.data.documents[0],"<<<<<<<<<<<<<document")
      console.log(document, '<<<<<<<<<<<<<document');
      return document;
    } catch (error) {
      console.error('Error retrieving document:', error.message, '\ndata>>>>> ', error.data);
      throw error;
    }
  },

  workFlow: async (workflowRunBuilder) => {
    try {
      // Upload document to Onfido (using 'passport' as an example)
      const document = await onfido.createWorkflowRun(workflowRunBuilder);

      return document;
    } catch (error) {
      console.error('Error during Onfido document upload:', error.message);
      throw error;
    }
  }
};
