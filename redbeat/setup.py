#!/usr/bin/env python

from distutils.core import setup

setup(name='redbeat',
      version='0.1',
      description='Redis-based heartbeat monitoring',
      author='Joe DeBlasio',
      author_email='git@joedeblasio.com',
      py_modules=['redbeat'],
      requires=['redis', 'enum', 'pickle'],
     )

