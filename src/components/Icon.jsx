
import React from 'react';
import PropTypes from 'prop-types';
import { icons } from 'lucide-react';

const toPascalCase = (str) => {
  if (!str) return '';
  return str.replace(/(^\w|-\w)/g, (text) => text.replace(/-/, "").toUpperCase());
};

const Icon = ({ name, className, ...props }) => {
  const LucideIcon = icons[toPascalCase(name)];

  if (!LucideIcon) {
    // console.warn(`Icon not found: ${name}`);
    return null;
  }

  return <LucideIcon className={className} {...props} />;
};


Icon.propTypes = {
  name: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default Icon;
