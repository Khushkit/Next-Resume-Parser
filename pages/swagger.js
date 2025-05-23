import { useEffect } from 'react';
import { createSwaggerSpec } from 'next-swagger-doc';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { swaggerOptions } from './api/swagger';

const ApiDoc = ({ spec }) => {
  return (
    <div className="swagger-ui-container">
      <SwaggerUI spec={spec} />
    </div>
  );
};

export const getStaticProps = async () => {
  const spec = createSwaggerSpec(swaggerOptions);
  return {
    props: {
      spec,
    },
  };
};

export default ApiDoc;
